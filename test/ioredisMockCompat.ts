import { Command } from 'ioredis'

/**
 * ioredis 6 reply transformers have the signature `(result, context)` and read the
 * connection protocol (RESP2 vs RESP3) off the context. ioredis-mock still calls them
 * with the pre-v6 single-argument signature, so `zrange` and every other sorted set
 * pair command throws `Cannot read properties of undefined (reading 'protocol')`.
 *
 * The mock always produces RESP2-shaped replies, so fill in a RESP2 context whenever
 * the caller did not pass one. Real clients pass their own context and are unaffected.
 *
 * Remove once ioredis-mock supports ioredis 6.
 */
const RESP2_CONTEXT = { protocol: 2, replyMapping: 'legacy' }

type ReplyTransformer = (result: unknown, context?: unknown) => unknown

const replyTransformers = (
  Command as unknown as {
    _transformer: { reply: Record<string, ReplyTransformer> }
  }
)._transformer.reply

for (const [name, transform] of Object.entries(replyTransformers)) {
  // arity 1 means the pre-v6 signature, which the mock already calls correctly
  if (transform.length < 2) {
    continue
  }
  replyTransformers[name] = (result, context) =>
    transform(result, context ?? RESP2_CONTEXT)
}
