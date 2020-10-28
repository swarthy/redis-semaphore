import { createEval } from '../../utils/index'

export const refreshLua = createEval(
  `
  local key = KEYS[1]
  local permits = tonumber(ARGV[1])
  local identifier = ARGV[2]
  local lockTimeout = ARGV[3]
  local now = ARGV[4]
  local args = {}

  if redis.call('zscore', key, identifier .. '_0') then
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
