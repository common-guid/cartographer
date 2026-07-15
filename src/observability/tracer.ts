import { Raindrop } from 'raindrop-ai';
import { Langfuse } from 'langfuse';
import { AsyncLocalStorage } from 'node:async_hooks';

// Helper function to sanitize and truncate metadata values for Langfuse (strings <=200 chars)
function sanitizeMetadata(metadata: any): Record<string, string> {
  const result: Record<string, string> = {};
  if (!metadata || typeof metadata !== 'object') return result;

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    let strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (strVal.length > 200) {
      strVal = strVal.substring(0, 197) + '...';
    }
    result[key] = strVal;
  }
  return result;
}

export class InteractionContext {
  private activeSpanStorage = new AsyncLocalStorage<any>();

  constructor(private raindropSpan: any, private langfuseSpan: any) {}

  private getActiveSpan() {
    return this.activeSpanStorage.getStore() || this.langfuseSpan;
  }

  // Wrap a block in a span with proper parent-child nesting
  async withSpan<T>(
    spanConfig: { name: string; properties?: any; inputParameters?: any[] },
    fn: () => Promise<T>
  ): Promise<T> {
    const parent = this.getActiveSpan();
    const childLangfuse = parent?.span({
      name: spanConfig.name,
      metadata: sanitizeMetadata(spanConfig.properties),
    });

    return this.activeSpanStorage.run(childLangfuse, async () => {
      try {
        let result;
        if (this.raindropSpan) {
           // We just let raindrop run it if it exists. But we also need to ensure it runs within the ALS context.
           // However, `raindropSpan.withSpan` already calls `fn`. Wait, if we call `raindropSpan.withSpan(spanConfig, fn)`, it calls `fn`.
           // So we can just await that.
           result = await this.raindropSpan.withSpan(spanConfig, fn);
        } else {
           result = await fn();
        }

        childLangfuse?.end({ output: typeof result === 'string' ? result.substring(0, 1000) : result });
        return result;
      } catch (err: any) {
        childLangfuse?.end({ level: 'ERROR', statusMessage: err.message });
        throw err;
      }
    });
  }

  // Compatibility for Raindrop addAttachments
  addAttachments(attachments: any[]) {
    if (this.raindropSpan && typeof this.raindropSpan.addAttachments === 'function') {
      this.raindropSpan.addAttachments(attachments);
    }
    // No-op for Langfuse for now
  }

  // Compatibility for Raindrop finish
  finish(options?: any) {
    if (this.raindropSpan && typeof this.raindropSpan.finish === 'function') {
      this.raindropSpan.finish(options);
    }

    if (this.langfuseSpan && options && typeof options === 'object') {
       // Root langfuse trace doesn't have end(), only update(). It flushes via shutdown.
       const metadata: Record<string, any> = sanitizeMetadata(options);
       if (options.output) {
         metadata['output'] = typeof options.output === 'string' ? options.output.substring(0, 1000) : options.output;
       }
       this.langfuseSpan.update({ metadata });
    }
  }

  startToolSpan(config: { name: string; properties?: any; inputParameters?: any }) {
    const parent = this.getActiveSpan();
    let rSpan: any;

    if (this.raindropSpan && typeof this.raindropSpan.startToolSpan === 'function') {
      rSpan = this.raindropSpan.startToolSpan(config);
    }

    const lSpan = parent?.span({
      name: config.name,
      metadata: sanitizeMetadata(config.properties),
    });

    return {
      setOutput: (output: any) => {
        if (rSpan) rSpan.setOutput(output);
        lSpan?.update({ metadata: sanitizeMetadata(output) });
      },
      setError: (err: Error) => {
        if (rSpan) rSpan.setError(err);
        lSpan?.update({ level: 'ERROR', statusMessage: err.message });
      },
      end: () => {
        if (rSpan) rSpan.end();
        lSpan?.end();
      }
    };
  }

  // Log live LLM generation calls as generations (with correct input/output token keys)
  startGeneration(config: { name: string; model: string; input: string }) {
    const parent = this.getActiveSpan();

    // Fallback to startToolSpan for Raindrop
    let rSpan: any;
    if (this.raindropSpan && typeof this.raindropSpan.startToolSpan === 'function') {
      rSpan = this.raindropSpan.startToolSpan({
        name: config.name,
        properties: { model: config.model },
      });
    }

    const langfuseGen = parent?.generation({
      name: config.name,
      model: config.model,
      input: config.input,
    });

    return {
      setOutput: (output: string) => {
        if (rSpan) rSpan.setOutput({ size: output.length });
        langfuseGen?.update({
          output,
          usage: {
            // Langfuse JS/TS SDK expects manual token usage as input/output/total (not promptTokens/completionTokens)
            input: Math.ceil(config.input.length / 4),
            output: Math.ceil(output.length / 4),
          }
        });
      },
      setError: (err: Error) => {
        if (rSpan) rSpan.setError(err);
        langfuseGen?.update({
          level: 'ERROR',
          statusMessage: err.message,
        });
      },
      end: () => {
        if (rSpan) rSpan.end();
        langfuseGen?.end();
      }
    };
  }
}

export class TracerService {
  private raindrop?: Raindrop;
  private langfuse?: Langfuse;
  private initialized = false;

  // Lazily initialize SDKs to avoid race conditions with dotenv config loads
  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    if (process.env.RAINDROP_WRITE_KEY && process.env.RAINDROP_DISABLED !== 'true') {
      this.raindrop = new Raindrop({
        writeKey: process.env.RAINDROP_WRITE_KEY,
        localWorkshopUrl: process.env.RAINDROP_WORKSHOP_URL,
        disableBatching: true,
      });
    }

    if (process.env.LANGFUSE_ENABLED === 'true' && process.env.LANGFUSE_SECRET_KEY) {
      this.langfuse = new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL,
      });
    }
  }

  // Create a root trace supporting backwards-compatible parameters
  begin(params: {
    eventId?: string;
    event: string;
    userId: string;
    input?: string;
    model?: string;
    properties?: Record<string, string>;
  }) {
    this.ensureInitialized();

    const raindropTrace = this.raindrop?.begin({
      eventId: params.eventId || '',
      event: params.event,
      userId: params.userId,
      input: params.input,
      model: params.model,
      properties: params.properties as any,
    });

    const langfuseTrace = this.langfuse?.trace({
      id: params.eventId,
      name: params.event,
      userId: params.userId,
      input: params.input,
      metadata: sanitizeMetadata({
        ...params.properties,
        model: params.model,
      }),
    });

    return new InteractionContext(raindropTrace, langfuseTrace);
  }

  async shutdown() {
    if (this.raindrop) {
      await this.raindrop.close();
    }
    if (this.langfuse) {
      await this.langfuse.shutdownAsync();
    }
  }
}

export const tracer = new TracerService();
