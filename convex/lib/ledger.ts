import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export const METHODOLOGY_VERSION = 'impact-v1'

export function normalizeWeightDeltaGrams(weightDeltaGrams: number): number {
  const normalized = Math.round(weightDeltaGrams)

  if (!Number.isSafeInteger(normalized)) {
    throw new RangeError('weightDeltaGrams must be a finite safe number')
  }

  return normalized
}

export function serializeLedgerMetadata(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  return metadata === undefined ? undefined : JSON.stringify(metadata)
}

type LedgerActor =
  | {
      actorId: Id<'users'>
      actorRole: Doc<'users'>['role']
    }
  | {
      actorId?: never
      actorRole?: never
    }

export type LedgerEventInput = {
  surplusItemId: Id<'surplusItems'>
  eventType: Doc<'materialFlowLedger'>['eventType']
  weightDeltaGrams: number
  orderId?: Id<'orders'>
  recoveryBatchId?: Id<'recoveryBatches'>
  metadata?: Record<string, unknown>
} & LedgerActor

/**
 * Append a Material Flow Ledger entry inside the mutation whose state change it records.
 * Never expose or invoke this helper through a separate Convex function.
 */
export async function recordLedgerEvent(
  ctx: MutationCtx,
  input: LedgerEventInput,
): Promise<Id<'materialFlowLedger'>> {
  return ctx.db.insert('materialFlowLedger', {
    surplusItemId: input.surplusItemId,
    orderId: input.orderId,
    recoveryBatchId: input.recoveryBatchId,
    eventType: input.eventType,
    weightDeltaGrams: normalizeWeightDeltaGrams(input.weightDeltaGrams),
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: serializeLedgerMetadata(input.metadata),
    methodologyVersion: METHODOLOGY_VERSION,
    occurredAt: Date.now(),
  })
}
