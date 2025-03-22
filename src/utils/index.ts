import { RedisClient } from '../types'
import createEval from './createEval'

export { createEval }

export async function delay(ms: number): Promise<void> {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function getConnectionName(client: RedisClient): string {
  const connectionName = client.options?.connectionName
  return connectionName ? `<${connectionName}>` : '<unknown client>'
}
