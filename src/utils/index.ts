import { RedisClient } from '../types.js'
import createEval from './createEval.js'

export { createEval }

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = (): void => {
      cleanup();
      reject(signal!.reason);
    };

    const cleanup = (): void => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    if (signal?.aborted) {
      onAbort()
    }
    signal?.addEventListener('abort', onAbort);
  })
}

export function getConnectionName(client: RedisClient): string {
  const connectionName = client.options?.connectionName
  return connectionName ? `<${connectionName}>` : '<unknown client>'
}
