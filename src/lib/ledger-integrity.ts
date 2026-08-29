import type { ImpactLedgerEntry, ImpactSummary } from './impact'

export type LedgerIntegrityEvent = ImpactLedgerEntry & {
  orderId?: string
  recoveryBatchId?: string
}

export type LedgerIntegrityIssue = {
  code:
    | 'LISTED_COUNT'
    | 'EVENT_BEFORE_LISTED'
    | 'RESCUED_BEFORE_PAID'
    | 'PROCESSED_BEFORE_INTAKE'
    | 'MISSING_TERMINAL_EVENT'
    | 'DUPLICATE_TERMINAL_EVENT'
    | 'WEIGHT_NOT_CONSERVED'
    | 'IMPLAUSIBLE_CIRCULARITY'
  message: string
  entryId?: string
}

const terminalStatuses = new Set(['closed', 'recovered', 'residual', 'moderated'])

function parsedMetadata(value: string | undefined): Record<string, unknown> | null {
  try {
    const parsed: unknown = value ? JSON.parse(value) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function terminalEventMatches(status: string, event: LedgerIntegrityEvent): boolean {
  if (status === 'closed') return event.eventType === 'RESCUED'
  if (status === 'recovered') {
    const data = parsedMetadata(event.metadata)
    return event.eventType === 'PROCESSED'
      && typeof data?.outputWeightGrams === 'number'
      && data.outputWeightGrams > 0
  }
  if (status === 'residual') {
    if (event.eventType === 'ROUTING_FAILED' || event.eventType === 'MODERATED') return true
    const data = parsedMetadata(event.metadata)
    return event.eventType === 'PROCESSED'
      && typeof data?.residualWeightGrams === 'number'
      && data.residualWeightGrams > 0
  }
  if (status === 'moderated') return event.eventType === 'MODERATED'
  return true
}

export function checkItemLedgerIntegrity(
  status: string,
  entries: readonly LedgerIntegrityEvent[],
  summary: ImpactSummary,
): LedgerIntegrityIssue[] {
  const issues: LedgerIntegrityIssue[] = []
  const listed = entries.filter((entry) => entry.eventType === 'LISTED')
  if (listed.length !== 1) {
    issues.push({ code: 'LISTED_COUNT', message: `Rescue Item memiliki ${listed.length} event LISTED; seharusnya tepat satu.` })
  }

  const listedAt = listed[0]?.occurredAt
  for (const entry of entries) {
    if (entry.eventType !== 'LISTED' && listedAt !== undefined && (entry.occurredAt ?? 0) < listedAt) {
      issues.push({ code: 'EVENT_BEFORE_LISTED', message: `${entry.eventType} tercatat sebelum LISTED.`, entryId: entry.id })
    }
    if (entry.eventType === 'RESCUED') {
      const hasEarlierPayment = entries.some((candidate) => candidate.eventType === 'PAID'
        && candidate.orderId === entry.orderId && (candidate.occurredAt ?? 0) <= (entry.occurredAt ?? 0))
      if (!entry.orderId || !hasEarlierPayment) {
        issues.push({ code: 'RESCUED_BEFORE_PAID', message: 'RESCUED tidak memiliki PAID yang lebih dahulu untuk order yang sama.', entryId: entry.id })
      }
    }
    if (entry.eventType === 'PROCESSED') {
      const hasEarlierIntake = entries.some((candidate) => candidate.eventType === 'INTAKE_ACCEPTED'
        && candidate.recoveryBatchId === entry.recoveryBatchId && (candidate.occurredAt ?? 0) <= (entry.occurredAt ?? 0))
      if (!entry.recoveryBatchId || !hasEarlierIntake) {
        issues.push({ code: 'PROCESSED_BEFORE_INTAKE', message: 'PROCESSED tidak memiliki INTAKE_ACCEPTED yang lebih dahulu untuk batch yang sama.', entryId: entry.id })
      }
    }
  }

  if (terminalStatuses.has(status) && !entries.some((entry) => terminalEventMatches(status, entry))) {
    issues.push({ code: 'MISSING_TERMINAL_EVENT', message: `Status ${status} tidak didukung event terminal yang diwajibkan.` })
  }

  const terminalKeys = new Set<string>()
  for (const entry of entries) {
    if (!['RESCUED', 'PROCESSED', 'ROUTING_FAILED', 'MODERATED'].includes(entry.eventType)) continue
    const key = `${entry.eventType}:${entry.orderId ?? entry.recoveryBatchId ?? entry.surplusItemId}`
    if (terminalKeys.has(key)) {
      issues.push({ code: 'DUPLICATE_TERMINAL_EVENT', message: `${entry.eventType} terminal terduplikasi untuk referensi yang sama.`, entryId: entry.id })
    }
    terminalKeys.add(key)
  }

  const balance = summary.conservation.itemBalances.find((item) => item.surplusItemId === entries[0]?.surplusItemId)?.balanceGrams ?? 0
  if (terminalStatuses.has(status) && balance !== 0) {
    issues.push({ code: 'WEIGHT_NOT_CONSERVED', message: `Rekonsiliasi material berselisih ${balance.toLocaleString('id-ID')} g; nilai seharusnya 0 g.` })
  }
  if (summary.circularityRatePercent !== null && summary.circularityRatePercent > 100) {
    issues.push({ code: 'IMPLAUSIBLE_CIRCULARITY', message: `Circularity rate ${summary.circularityRatePercent.toLocaleString('id-ID')}% mustahil dan perlu ditinjau.` })
  }
  return issues
}

export function isTerminalItemStatus(status: string): boolean {
  return terminalStatuses.has(status)
}
