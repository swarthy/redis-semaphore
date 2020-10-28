import Redis from 'ioredis'

import { refreshLua } from './lua'

export interface Options {
  identifier: string
  lockTimeout: number
  now: number
}

export async function refresh(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  permits: number,
  options: Options
) {
  const { identifier, lockTimeout, now } = options
  return await refreshLua(client, [key, permits, identifier, lockTimeout, now])
}
