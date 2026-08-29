import { describe, expect, test } from "bun:test";
import { summarizeProcessorDashboard } from "../src/lib/recovery";

describe("ringkasan Processor", () => {
  test("menggunakan event ledger untuk intake, output, residual, dan recovery rate", () => {
    const now = Date.UTC(2026, 7, 29, 5);
    const summary = summarizeProcessorDashboard({
      dailyCapacityGrams: 2_000,
      now,
      batches: [
        { status: "offered", offeredWeightGrams: 400 },
        { status: "accepted", offeredWeightGrams: 500, acceptedAt: now },
        { status: "collected", offeredWeightGrams: 300, acceptedAt: now },
      ],
      events: [
        { eventType: "INTAKE_ACCEPTED", weightDeltaGrams: 800, occurredAt: now },
        { eventType: "PROCESSED", weightDeltaGrams: -800, occurredAt: now, metadata: JSON.stringify({ outputType: "compost", outputWeightGrams: 600, residualWeightGrams: 100 }) },
      ],
    });

    expect(summary).toMatchObject({
      offeredCount: 1, acceptedCount: 1, collectedCount: 1, capacityCommittedGrams: 800,
      todayIntakeGrams: 800, processedIntakeGrams: 800, outputWeightGrams: 600,
      residualWeightGrams: 100, recoveryRatePercent: 75, outputByType: { compost: 600 },
    });
  });
});
