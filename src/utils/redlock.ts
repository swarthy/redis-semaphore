export function getQuorum(clientCount: number) {
  return Math.round((clientCount + 1) / 2)
}

export function smartSum(count: number, zeroOrOne: number) {
  return count + zeroOrOne
}
