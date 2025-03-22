export function getQuorum(clientCount: number): number {
  return Math.round((clientCount + 1) / 2)
}

export function smartSum(count: number, zeroOrOne: number): number {
  return count + zeroOrOne
}
