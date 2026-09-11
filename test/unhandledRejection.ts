function throwReason(reason: any) {
  console.log('unhandled rejection:', reason)
  throw reason
}

export const unhandledRejectionSpy = vi.fn()

export function catchUnhandledRejection() {
  unhandledRejectionSpy.mockClear()
  process.removeListener('unhandledRejection', throwReason)
  process.on('unhandledRejection', unhandledRejectionSpy)
}

export function throwUnhandledRejection() {
  process.removeListener('unhandledRejection', unhandledRejectionSpy)
  process.on('unhandledRejection', throwReason)
}

export function init() {
  process.on('unhandledRejection', throwReason)
}

export function removeAllListeners() {
  process.removeListener('unhandledRejection', unhandledRejectionSpy)
  process.removeListener('unhandledRejection', throwReason)
}
