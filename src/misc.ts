export interface TimeoutOptions {
  lockTimeout?: number
  acquireTimeout?: number
  retryInterval?: number
  refreshInterval?: number
}

export const defaultTimeoutOptions = {
  lockTimeout: 10000,
  acquireTimeout: 10000,
  retryInterval: 10
}
