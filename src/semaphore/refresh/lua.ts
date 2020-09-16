import { createEval } from '../../utils/index'

export const refreshLua = createEval(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]
  local lockTimeout = ARGV[2]
  local now = ARGV[3]

  if redis.call('zscore', key, identifier) then
    redis.call('zadd', key, now, identifier)
    redis.call('pexpire', key, lockTimeout)
    return 1
  else
    return 0
  end`,
  1
)
