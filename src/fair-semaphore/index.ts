import { Redis } from 'ioredis'
import uuid4 from 'uuid/v4'

import TimeoutError from '../errors/TimeoutError'
import acquireSemaphore from './acquire'
import refreshSemaphore from './refresh'
import releaseSemaphore from './release'

function getKey(key: string) {
  return `semaphore:${key}`
}

export async function acquire(
  client: Redis,
  key: string,
  limit: number,
  lockTimeout: number,
  acquireTimeout: number,
  retryInterval: number
) {
  const identifier = uuid4()
  const finalKey = getKey(key)
  const result = await acquireSemaphore(
    client,
    finalKey,
    limit,
    identifier,
    lockTimeout,
    acquireTimeout,
    retryInterval
  )
  if (result) {
    return identifier
  } else {
    throw new TimeoutError(`Acquire semaphore ${key} timeout`)
  }
}

export async function release(client: Redis, key: string, identifier: string) {
  const finalKey = getKey(key)
  return await releaseSemaphore(client, finalKey, identifier)
}

export async function refresh(client: Redis, key: string, identifier: string) {
  const finalKey = getKey(key)
  return await refreshSemaphore(client, finalKey, identifier)
}
