# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn --immutable          # install deps (Yarn 4 / Berry)
./setup-redis-servers.sh  # start the 3 docker-compose redis nodes tests need (ports 6001-6003)
yarn dev                  # vitest watch mode
yarn test                 # vitest run (all tests, once) — requires the redis servers above to be running
yarn lint                 # oxlint --type-aware . (type-aware; needs a clean `tsc` — see below)
yarn build                # rm -rf lib && tsc -b tsconfig.build.json
```

Run a single test file or test case with vitest directly, e.g. `yarn vitest run test/src/RedisMutex.test.ts` or `yarn vitest run -t "should acquire and release lock"`.

Tests run against real Redis (via `test/redisClient.ts`, which connects `client1`/`client2`/`client3` to `redis://127.0.0.1:600{1,2,3}` or `$REDIS_URI{1,2,3}`) and against `ioredis-mock`. Test files run one at a time (`fileParallelism: false` in `vitest.config.ts`) because several suites intentionally stop/start the shared docker-compose redis nodes (quorum failover tests) and share global clients.

`yarn preversion` runs `lint && test && build` — this is the full gate a release must pass.

## Architecture

**Lock primitives.** Every lock type (`Mutex`, `Semaphore`, `MultiSemaphore`, and their `Redlock*` counterparts) extends the abstract `Lock` base class in `src/Lock.ts`, which owns the shared lifecycle: `acquire`/`tryAcquire`/`release`, the background auto-refresh timer, and lost-lock detection (`onLockLost`). Subclasses only implement three protected hooks — `_acquire`, `_refresh`, `_release` — and set `_kind`/`_key`. Read `Lock.ts` first when touching any lock type; the actual Redis logic per lock type lives in sibling directories (`src/mutex/`, `src/semaphore/`, `src/multiSemaphore/`, `src/redlockMutex/`, `src/redlockSemaphore/`, `src/redlockMultiSemaphore/`), each split into `acquire`/`refresh`/`release` modules.

**Atomicity via Lua.** All Redis mutations are done through Lua scripts (`lua.ts` files next to each `acquire`/`refresh` module) run through `src/utils/createEval.ts`, which caches the script's SHA1 and falls back from `EVALSHA` to `EVAL` on `NOSCRIPT`. Redis/Lua can return numbers as strings (ioredis's `stringNumbers` option), so results are coerced with unary `+` (e.g. `+result === 1`) even where the static return type already says `number` — this is intentional defensive coercion, not dead code (`typescript/no-unnecessary-type-conversion` is disabled in `.oxlintrc.json` specifically for this pattern).

**Redlock variants** (`RedlockMutex`, `RedlockSemaphore`, `RedlockMultiSemaphore`) run the same acquire/refresh/release logic against an array of independent Redis clients and require a quorum (`src/utils/redlock.ts`'s `getQuorum`), per the [Redlock algorithm](https://redis.io/topics/distlock#the-redlock-algorithm).

**Semaphore vs MultiSemaphore.** Both are backed by a Redis sorted set keyed `semaphore:<key>` and share that keyspace — `MultiSemaphore` just acquires/releases multiple permits at once instead of one.

## Code style

- No semicolons, single quotes, no trailing commas (`.prettierrc`).
- Fields use a leading-underscore convention (`_client`, `_key`, `_identifier`, ...) for protected/internal state on the `Lock` subclasses — this is deliberate and `no-underscore-dangle` is disabled in `.oxlintrc.json`.
- Linting is `oxlint` with `--type-aware` (via `oxlint-tsgolint`), not ESLint. `.oxlintrc.json` documents several deliberate rule exceptions (see comments/rules there) for patterns that look wrong out of context but aren't — check it before "fixing" something oxlint flags.
- Tests use Vitest's built-in `expect`/`vi` globally (`globals: true` in `vitest.config.ts`) — no `chai`/`sinon`. There is no built-in order-independent array-equality matcher, so use the local `expectMembers()` helper from `test/assertions.ts` instead of sorting manually.
