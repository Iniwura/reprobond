const CONTRACT_DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export function serializeContractDeadline(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error('Deadline must be a valid date.')
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function localDatetimeToContract(value: string): string {
  if (!LOCAL_DATETIME_PATTERN.test(value)) throw new Error('Use a local date and time.')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Deadline must be a valid local date and time.')
  return serializeContractDeadline(parsed)
}

export function normalizeContractDeadline(value: string): string {
  const candidate = value.trim()
  if (!candidate) return defaultContractDeadline()
  if (CONTRACT_DEADLINE_PATTERN.test(candidate)) {
    const parsed = new Date(candidate)
    if (Number.isNaN(parsed.getTime())) throw new Error('Deadline must be a valid UTC date.')
    return candidate
  }
  return localDatetimeToContract(candidate)
}

export function defaultContractDeadline(days = 30, now = new Date()): string {
  return serializeContractDeadline(new Date(now.getTime() + days * 86400000))
}

export function isContractDeadlineReached(deadline: string, now = new Date()): boolean {
  const parsed = new Date(deadline)
  return !Number.isNaN(parsed.getTime()) && now.getTime() >= parsed.getTime()
}
