import { RedisClient } from '../types'
import createEval from './createEval'

export { createEval }

export async function delay(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function getConnectionName(client: RedisClient) {
  try {
    const connName = client.options.connectionName
    if (typeof connName === 'string') {
      return `<${connName}>`
    }
  } catch (ignored: unknown) {}
  return '<unknown client>'
}
