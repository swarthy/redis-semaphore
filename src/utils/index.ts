import Redis from 'ioredis'

import createEval from './createEval'

export { createEval }

export async function delay(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function getConnectionName(client: Redis) {
  return client instanceof Redis && client.options.connectionName
    ? `<${client.options.connectionName}>`
    : '<client>'
}
