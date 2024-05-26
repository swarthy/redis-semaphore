import { RedisClient } from '../types'
import createEval from './createEval'

export { createEval }

export async function delay(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function getConnectionName(client: RedisClient) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore this path is for ioredis
  const connectionName = client.options?.connectionName
  return connectionName ? `<${connectionName}>` : '<unknown client>'
}
