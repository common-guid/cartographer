import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Langfuse } from 'langfuse';
import { TracerService, tracer, InteractionContext } from '../src/observability/tracer.js';

describe('Unified Tracer Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (tracer as any).initialized = false;
  });

  it('should initialize trace with proper structure', () => {
    const langfuseTraceSpy = vi.spyOn(Langfuse.prototype, 'trace').mockReturnValue({} as any);

    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_SECRET_KEY = 'test_sk';

    const context = tracer.begin({
      eventId: '123',
      event: 'test_event',
      userId: 'test_user',
      input: 'test_input',
      model: 'test_model',
      properties: { custom: 'value' },
    });

    expect(langfuseTraceSpy).toHaveBeenCalled();
    expect(langfuseTraceSpy).toHaveBeenCalledWith({
      id: '123',
      name: 'test_event',
      userId: 'test_user',
      input: 'test_input',
      metadata: {
        custom: 'value',
        model: 'test_model',
      },
    });

    expect(context).toBeInstanceOf(InteractionContext);
  });

  it('should wrap execution in withSpan', async () => {
    const mockEnd = vi.fn();
    const mockSpan = vi.spyOn(Langfuse.prototype, 'span').mockReturnValue({ end: mockEnd } as any);
    vi.spyOn(Langfuse.prototype, 'trace').mockReturnValue({ id: '123' } as any);

    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_SECRET_KEY = 'test_sk';

    const context = tracer.begin({
      eventId: '123',
      event: 'test_event',
      userId: 'test_user',
    });

    const mockCallback = vi.fn().mockResolvedValue('test_result');
    const result = await context.withSpan({ name: 'test_span', properties: { p: '1' } }, mockCallback);

    expect(result).toBe('test_result');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockSpan).toHaveBeenCalledWith({
      name: 'test_span',
      traceId: '123',
      parentObservationId: undefined,
      metadata: { p: '1' }
    });
    expect(mockEnd).toHaveBeenCalledWith({ output: 'test_result' });
  });

  it('should create generation with proper parameters', () => {
    const mockUpdate = vi.fn();
    const mockEnd = vi.fn();
    const mockGeneration = vi.spyOn(Langfuse.prototype, 'generation').mockReturnValue({ update: mockUpdate, end: mockEnd } as any);
    vi.spyOn(Langfuse.prototype, 'trace').mockReturnValue({ id: '123' } as any);

    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_SECRET_KEY = 'test_sk';

    const context = tracer.begin({
      eventId: '123',
      event: 'test_event',
      userId: 'test_user',
    });

    const gen = context.startGeneration({
      name: 'test_gen',
      model: 'gpt-4',
      input: 'long input string', // length 17
    });

    expect(mockGeneration).toHaveBeenCalledWith({
      name: 'test_gen',
      traceId: '123',
      parentObservationId: undefined,
      model: 'gpt-4',
      input: 'long input string',
    });

    gen.setOutput('output string'); // length 13

    expect(mockUpdate).toHaveBeenCalledWith({
      output: 'output string',
      usage: {
        input: 5, // ceil(17/4)
        output: 4, // ceil(13/4)
      }
    });

    gen.end();
    expect(mockEnd).toHaveBeenCalled();
  });
});