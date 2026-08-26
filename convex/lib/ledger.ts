import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { UserRole } from './guards'

export const METHODOLOGY_VERSION = 'impact-v1'

type LedgerInput = {
  surplusItemId: Id<'surplusItems'>
  eventType:
    | 'LISTED'
    | 'PRICE_ADJUSTED'
    | 'RESERVED'
    | 'PAID'
    | 'RESCUED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'ROUTED'
    | 'ROUTING_FAILED'
    | 'INTAKE_ACCEPTED'
    | 'INTAKE_DECLINED'
    | 'PROCESSED'
    | 'MODERATED'
  weightDeltaGrams: number
  actorId?: Id<'users'>
  actorRole?: UserRole
  orderId?: Id<'orders'>
  recoveryBatchId?: Id<'recoveryBatches'>
  metadata?: Record<string, unknown>
}

/**
 * Append a Material Flow Ledger entry.
 *
 * MUST be called inside the same mutation as the state change it records.
 * Never call from an action or from the client.
 */
export async function recordLedgerEvent(
  ctx: MutationCtx,
  input: LedgerInput,
): Promise<Id<'materialFlowLedger'>> {
  return ctx.db.insert('materialFlowLedger', {
    surplusItemId: input.surplusItemId,
    orderId: input.orderId,
    recoveryBatchId: input.recoveryBatchId,
    eventType: input.eventType,
    weightDeltaGrams: Math.round(input.weightDeltaGrams),
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    methodologyVersion: METHODOLOGY_VERSION,
    occurredAt: Date.now(),
  })
}
