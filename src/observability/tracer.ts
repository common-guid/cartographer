import { Raindrop } from 'raindrop-ai';

export const raindrop = new Raindrop({
  writeKey: process.env.RAINDROP_WRITE_KEY ?? '',
  debugLogs: process.env.NODE_ENV !== 'production',
  disabled: process.env.RAINDROP_DISABLED === 'true',
  disableBatching: true, // immediate flushing for dev/Workshop
});
