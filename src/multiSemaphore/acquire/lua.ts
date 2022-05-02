import { createEval } from '../../utils/index'

export const acquireLua = createEval<
  [string, number, number, string, number, number],
  0 | 1
>(
  `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local permits = tonumber(ARGV[2])
  local identifier = ARGV[3]
  local lockTimeout = tonumber(ARGV[4])
  local now = tonumber(ARGV[5])
  local expiredTimestamp = now - lockTimeout
  local args = {}

  redis.call('zremrangebyscore', key, '-inf', expiredTimestamp)

  if (redis.call('zcard', key) + permits) <= limit then
    for i=0, permits - 1 do
      table.insert(args, now)
      table.insert(args, identifier .. '_' .. i)
    end
    redis.call('zadd', key, unpack(args))
    redis.call('pexpire', key, lockTimeout)
    return 1
  else
    return 0
  end`,
  1
)
