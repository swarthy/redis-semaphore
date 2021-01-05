export interface Lockable {
  identifier: string
  acquire(): Promise<void>
  release(): Promise<void>
}
