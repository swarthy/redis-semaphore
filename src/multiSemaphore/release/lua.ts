import { createEval } from '../../utils/index'

export const releaseLua = createEval<[string, number, string], number>(
  `
  local key = KEYS[1]
  local permits = tonumber(ARGV[1])
  local identifier = ARGV[2]
  local args = {}

  for i=0, permits - 1 do
    table.insert(args, identifier .. '_' .. i)
  end

  return redis.call('zrem', key, unpack(args))
`,
  1
)
