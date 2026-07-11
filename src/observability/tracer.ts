import { Raindrop } from 'raindrop-ai';
import { OTLPTraceExporter as OTLPProtoTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

// Monkey-patch the Protobuf OTLP exporter to be a no-op.
// This prevents Traceloop's cloud exporter from making network requests to api.raindrop.ai (which causes 401/400 errors),
// while leaving the HTTP-JSON-based local debugger exporter intact.
OTLPProtoTraceExporter.prototype.export = function (spans, resultCallback) {
  if (resultCallback) {
    resultCallback({ code: 0 }); // 0 represents ExportResultCode.SUCCESS
  }
};

export const raindrop = new Raindrop({
  writeKey: process.env.RAINDROP_WRITE_KEY ?? '',
  localWorkshopUrl: process.env.RAINDROP_WORKSHOP_URL ?? 'http://localhost:5899/v1/',
  debugLogs: process.env.NODE_ENV !== 'production',
  disabled: process.env.RAINDROP_DISABLED === 'true',
  disableBatching: true, // immediate flushing for dev/Workshop
});
