import Redis from 'ioredis'

import { acquireLua } from './lua'

export interface Options {
  identifier: string
  lockTimeout: number
  now: number
}

export async function acquire(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  permits: number,
  limit: number,
  options: Options
) {
  const { identifier, lockTimeout, now } = options
  return await acquireLua(client, [
    key,
    permits,
    limit,
    identifier,
    lockTimeout,
    now
  ])
}
