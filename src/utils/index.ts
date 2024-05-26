import { RedisClient } from '../types'
import createEval from './createEval'

export { createEval }

export async function delay(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function getConnectionName(client: RedisClient) {
  const connectionName = client.options?.connectionName
  return connectionName ? `<${connectionName}>` : '<unknown client>'
}
