# Impact Methodology — Cirquo

**Document type:** Methodology specification  
**Methodology version:** `impact-v1`  
**Status:** Methodology contract — M6-01 aggregation available; dashboard rendering pending
**Last updated:** 2026-08-29

> This document defines how Cirquo measures environmental impact, what assumptions underpin those numbers, and — critically — **what they do not prove**. Every figure the product displays traces back to this methodology. If a judge, auditor, or partner challenges an impact claim, this document is the answer.

> **Implementation boundary.** M6-01 now provides pure ledger aggregation and
> role-scoped Convex queries. Rendering the Consumer, Merchant, Processor, and
> Admin dashboards remains M6-02/M6-03 work; see
> [IMPLEMENTATION_STATUS.md](../project/IMPLEMENTATION_STATUS.md).

---

## 1. Measurement Philosophy

Cirquo reports impact in **three tiers of decreasing certainty**, and always presents them in that order.

| Tier | Metric | Certainty | Source |
|---|---|---|---|
| **1 — Measured** | kg rescued, kg recovered, kg residual | High | Material Flow Ledger events |
| **2 — Derived** | Circularity rate, diversion rate, revenue recovered | High | Arithmetic on Tier 1 |
| **3 — Estimated** | CO2e avoided | **Low–moderate** | Tier 1 × published emission factors |

**The headline metric is always Tier 1.** "128 kg rescued" is a fact traceable to timestamped ledger entries. "256 kg CO2e avoided" is a model output that depends on emission factors we did not measure.

Presenting CO2e as the headline would be the single easiest way to lose credibility in Q&A — it is the number a knowledgeable judge will attack first, and it is the number we can defend least. See [RISKS.md](../business/RISKS.md) IMP-02.

### What we never claim

| ❌ Never say | ✅ Say instead |
|---|---|
| "Zero waste" | "93% circularity rate, 7% residual" |
| "100% closed-loop" | "We track where every kilogram goes" |
| "We prevented X tonnes of CO2" | "Estimated X tonnes CO2e avoided, based on published emission factors" |
| "Carbon neutral" | Nothing — we make no neutrality claim |
| "Verified carbon reduction" | "Verified material flow; estimated carbon impact" |

---

## 2. The Core Identity

Every metric derives from one conservation identity:

```
listed + measurementAdjustment
  = rescued + recovered + residual + processLoss + inProgress
```

| Term | Definition | Ledger source |
|---|---|---|
| **listed** | Total surplus that entered the system | `LISTED` events |
| **rescued** | Collected and consumed by a Consumer | `RESCUED` events |
| **recovered** | Converted by an Organic Processor into compost, BSF larvae, feed, or biogas | `PROCESSED` events, `outputWeightGrams` |
| **residual** | Neither rescued nor recovered | `ROUTING_FAILED`, `MODERATED`, and `PROCESSED` residual portion |
| **processLoss** | Measured mass lost during processing | `|PROCESSED.delta| − output − residual` |
| **measurementAdjustment** | Difference between declared and measured intake | `INTAKE_ACCEPTED.delta − metadata.declaredWeightGrams` |
| **inProgress** | Still moving through the system without an outcome | The reconciliation remainder |

`processLoss` and `measurementAdjustment` are explicit reconciliation values,
not circular outcomes. **`inProgress` is reported, never hidden.** Folding it
into residual overstates failure; omitting it makes the numbers not add up.
Dashboards show it explicitly.

The identity is enforced by the weight conservation check in [MATERIAL_LEDGER.md](MATERIAL_LEDGER.md) §7. If it fails for any item, every metric including that item is wrong by an unknown amount.

---

## 3. Tier 1 — Measured Metrics

### 3.1 Food Rescued

**Definition:** Total weight of food collected by Consumers and verified by Merchant pickup confirmation.

```
rescuedGrams = Σ |weightDeltaGrams| where eventType == 'RESCUED'
```

| Property | Value |
|---|---|
| Unit | Integer grams (displayed as kg) |
| Trigger | Merchant verifies the pickup code — never reservation, never payment |
| Trust level | **Moderate** — weight is a merchant-declared estimate |

**Why pickup, not payment:** a paid order that is never collected has rescued nothing. The material re-enters routing. Counting payment as rescue would inflate the headline metric with transactions that failed physically.

### 3.2 Food Recovered

**Definition:** Total weight of organic material accepted and processed by a verified Organic Processor into a usable output.

```
recoveredGrams = Σ metadata.outputWeightGrams where eventType == 'PROCESSED'
```

M5 first writes `INTAKE_ACCEPTED` with the positive, measured intake weight;
that event is an inventory handoff, not recovery. `PROCESSED` then carries the
negative measured weight and its metadata partitions that input into recovered
output, residual, and explicit process loss.

| Property | Value |
|---|---|
| Trigger | Processor logs a processing outcome |
| Trust level | **Higher than rescued** — weighed on the facility's scale |

This is the metric most competitors cannot produce, because their systems end at consumer purchase.

### 3.3 Residual

**Definition:** Material that reached neither a Consumer nor a Processor.

```
residualGrams =
    Σ metadata.residualWeightGrams (PROCESSED)
  + Σ metadata.residualWeightGrams (ROUTING_FAILED)
  + Σ |weightDeltaGrams| (MODERATED)
```

**Residual is displayed as prominently as rescued and recovered.** This is a deliberate presentation choice. A platform that reports only its successes is making a marketing claim; a platform that reports its failures at equal weight is making a measurement.

### 3.4 Declared vs. Measured Weight

The most significant integrity issue in Tier 1.

| Weight | Source | Reliability |
|---|---|---|
| `offeredWeightGrams` | Merchant estimate at listing | Low |
| `acceptedWeightGrams` | Processor scale at intake | High |
| `outputWeightGrams` | Processor scale after processing | High |
| `residualWeightGrams` | Processor scale | High |

**Rule:** when both a declared and a measured figure exist for the same material, impact calculations use the **measured** value.

The variance between them is retained and surfaced in Admin reporting. It is a direct signal of merchant estimation quality and, over time, a calibration input. It is not an embarrassment to hide — it is a measurement of measurement error, which is what an honest system produces.

---

## 4. Tier 2 — Derived Metrics

### 4.1 Circularity Rate

**The north-star metric.**

```
circularityRate = (rescued + recovered) / listed × 100
```

| Interpretation | Meaning |
|---|---|
| 100% | Impossible in practice. If displayed, it is a bug or a demo dataset with no residual |
| 90–95% | Excellent — the realistic ceiling |
| 80–90% | Good |
| 70–80% | Acceptable; routing needs attention |
| < 70% | The core claim is not supported ([RISKS.md](../business/RISKS.md) early warning) |

**Why not 100%.** Contamination, transport failure, processor capacity limits, material degradation, and packaging mixed into food waste all guarantee some residual. A system claiming 100% is either not measuring residual or not reporting it.

The demo target is **93%**. It is credible, and it invites the right follow-up question — "what happened to the 7%?" — which we can answer item by item from the ledger.

### 4.2 Diversion Rate

```
diversionRate = recovered / (listed − rescued) × 100
```

Measures how well Circular Routing performs on the material consumers did not take. Isolates routing effectiveness from marketplace performance — a platform can have a poor rescue rate but excellent diversion, or the reverse, and the two require different fixes.

### 4.3 Revenue Recovered

```
revenueRecovered = Σ metadata.totalPrice where eventType == 'RESCUED'
```

Money merchants recovered from food that would otherwise have been a total loss. The counterfactual is zero, not the original price.

### 4.4 Consumer Savings

```
savings = Σ (originalPrice − pricePaid) × quantity  for RESCUED events
```

`originalPrice` is `orders.originalPriceSnapshot`, written at reservation and
copied into `RESCUED` metadata with `quantity` and `totalPrice`. It is never
read from the mutable Rescue Item. Reported as an estimate: original price is
merchant-declared, and some consumers would not have bought at full price
anyway.

---

## 5. Tier 3 — CO2e Estimation

> ⚠️ **This is a model, not a measurement.** Every display of a CO2e figure in the product carries the word "estimated."

### 5.1 Method

```
co2eAvoidedGrams = (rescuedGrams × EF_rescue) + (recoveredGrams × EF_recovery)
```

| Factor | Value | Unit |
|---|---:|---|
| `EF_rescue` | **2.5** | kg CO2e avoided per kg food rescued |
| `EF_recovery` | **0.9** | kg CO2e avoided per kg food recovered |

### 5.2 Factor Derivation

**`EF_rescue = 2.5 kg CO2e/kg`**

Rescued food avoids emissions on two counts:

| Component | Estimate | Basis |
|---|---:|---|
| Avoided landfill decomposition | ~1.0 kg CO2e/kg | Anaerobic decomposition of food waste produces methane (GWP ~28× CO2 over 100 years). Indonesian landfills are predominantly unmanaged, favouring anaerobic conditions |
| Avoided replacement production | ~1.5 kg CO2e/kg | Food eaten is food not produced elsewhere — displacing agricultural production, processing, and transport emissions |

**`EF_recovery = 0.9 kg CO2e/kg`**

Recovered food avoids landfill decomposition but does **not** displace food production — nobody ate it.

| Component | Estimate |
|---|---:|
| Avoided landfill decomposition | ~1.0 kg CO2e/kg |
| Less: processing emissions (transport, facility energy) | ~−0.1 kg CO2e/kg |

**The 2.8× ratio between the factors is the important part.** It encodes the product's core priority: rescuing food for people is substantially better than processing it. If the two factors were equal, the model would imply routing is as good as rescue, which is false and would distort incentives.

### 5.3 Reference Implementation

```typescript
// src/lib/impact.ts

export const IMPACT_METHODOLOGY_VERSION = 'impact-v1'

export function estimateCo2e(rescuedGrams: number, recoveredGrams: number): number {
  return Math.round(
    rescuedGrams * 2.5 + recoveredGrams * 0.9,
  )
}
```

### 5.4 Versioning

Every ledger entry stores `methodologyVersion` ([DATABASE.md](../domain/DATABASE.md)). When emission factors change:

1. Increment to `impact-v2`; new entries carry the new version
2. **Historical entries keep `impact-v1`** — never retroactively recompute
3. Dashboards spanning a version boundary show a footnote
4. The change, its rationale, and its date are recorded in [CHANGELOG.md](../project/CHANGELOG.md)

**Why not recompute history:** an impact figure a merchant included in a sustainability report last quarter must not silently change this quarter. Stability of published numbers matters more than uniformity of methodology.

---

## 6. Assumptions

Stated explicitly so they can be challenged rather than discovered.

| # | Assumption | Confidence | If wrong |
|---|---|---|---|
| A1 | Rescued food would otherwise have gone to landfill | Moderate | Some would have been eaten by staff or donated. Overstates impact |
| A2 | Indonesian landfills are predominantly anaerobic | High | Methane assumption is core to both factors |
| A3 | Merchant-declared weights are within ±20% of actual | Low–moderate | All Tier 1 metrics carry this error |
| A4 | Rescued food displaces equivalent food production | Moderate | Some consumers buy in addition, not instead. Overstates `EF_rescue` |
| A5 | Processor-reported output weights are accurate | Moderate–high | Measured on scales, but self-reported |
| A6 | Transport emissions are negligible relative to avoided emissions | Moderate | Pickup is typically short-distance and often on existing routes |
| A7 | GWP100 of methane ≈ 28 | High | IPCC AR6 |
| A8 | Compost and BSF outputs displace synthetic fertiliser or feed | Low | Not currently credited; would increase `EF_recovery` if included |

**A3 is the weakest link and the one to address first.** Every Tier 1 number depends on merchants estimating weight correctly. Mitigations: plausible-range validation per category, clear input guidance, and preferring processor-measured weights wherever available.

---

## 7. Limitations

What this methodology explicitly does not establish.

| # | Limitation |
|---|---|
| L1 | **CO2e figures are estimates, not measurements.** No lab measurement, no per-item LCA |
| L2 | **Emission factors are global averages**, not Indonesia-specific. Indonesian factors exist but not at the granularity needed |
| L3 | **No counterfactual verification.** We cannot prove rescued food would have been wasted |
| L4 | **No end-of-life tracking for outputs.** Compost may be used or stockpiled; we credit production, not application |
| L5 | **Transport emissions are excluded** from both factors |
| L6 | **Packaging is not accounted for.** Some Rescue Items involve packaging with its own footprint |
| L7 | **Self-reported weights** at both merchant and processor ends |
| L8 | **Not audited** by a third party. The ledger is auditable; it has not yet been audited |
| L9 | **Not carbon credits.** These figures do not meet any registry's standard and are not tradeable |

**L9 matters commercially.** [BUSINESS.md](../business/BUSINESS.md) lists carbon-credit intermediation as a speculative long-term stream. It is speculative precisely because this methodology would need independent verification and registry-approved factors before any credit could be issued.

---

## 8. Comparison to Alternatives

Why this approach rather than the obvious alternatives.

| Approach | Rejected because |
|---|---|
| Report only kg, no CO2e | Stakeholders and ESG reporting need a carbon figure. Refusing to estimate is unhelpful |
| Full per-item LCA | Prohibitively expensive; needs data no small platform can obtain |
| Higher factors (some sources cite 4–6 kg CO2e/kg) | Inflates the headline. Conservative estimates survive scrutiny; aggressive ones invite it |
| Methane-specific reporting (kg CH4) | Harder to communicate, and more fragile to challenge |
| Third-party calculator API | Opaque methodology; we could not answer "how is this computed?" |

**Chosen posture: conservative, transparent, versioned.** A defensible 2.5 kg CO2e/kg beats an impressive 5.0 that collapses under one follow-up question.

---

## 9. Worked Example

A one-month pilot period.

**Ledger totals:**

| Metric | Value |
|---|---:|
| Listed | 1,000.0 kg |
| Rescued | 620.0 kg |
| Recovered | 310.0 kg |
| Residual | 45.0 kg |
| In progress | 25.0 kg |

**Verification:** 620 + 310 + 45 + 25 = 1,000 ✓

**Derived:**

| Metric | Calculation | Result |
|---|---|---:|
| Circularity rate | (620 + 310) / 1,000 | **93.0%** |
| Diversion rate | 310 / (1,000 − 620) | **81.6%** |
| Residual rate | 45 / 1,000 | **4.5%** |

**Estimated CO2e:**

| Component | Calculation | Result |
|---|---|---:|
| From rescue | 620 × 2.5 | 1,550 kg CO2e |
| From recovery | 310 × 0.9 | 279 kg CO2e |
| **Total** | | **1,829 kg CO2e** |

**How this is presented in the UI:**

```
FOOD RESCUED           620.0 kg
ORGANIC RECOVERED      310.0 kg
RESIDUAL                45.0 kg
IN PROGRESS             25.0 kg

CIRCULARITY RATE        93.0%

Estimated CO₂e avoided  1,829 kg
  ⓘ Estimate based on published emission factors (impact-v1).
    Not a measured value. See methodology.
```

The information hierarchy is the message: measured weights first, derived rate second, estimated carbon last and labelled.

---

## 10. Dashboard Scoping

The same aggregation, filtered by actor scope.

| Scope | Filter | Metrics shown |
|---|---|---|
| **Consumer** | Owned orders → corresponding `RESCUED` entries | kg rescued, estimated CO2e, money saved |
| **Merchant** | Items where `merchantId == merchant` | Listed / rescued / recovered / residual, circularity rate, revenue recovered |
| **Processor** | Batches where `processorId == processor` | Intake volume, output by type, residual rate, estimated CO2e |
| **Admin** | All entries | Platform totals, circularity rate, active actors, per-city breakdown |

**Consumers do not see a circularity rate.** `RESCUED` is written by the
Merchant, so Consumer scope is resolved through `orders.userId`, not
`ledger.actorId`; their personal projection has no complete `LISTED`
denominator. Showing "100% circularity" would be both true and misleading.

---

## 11. National Context

For problem framing — **never** presented as Cirquo's impact.

| Figure | Source |
|---|---|
| Indonesian food loss & waste: 23–48 million tonnes/year | Bappenas |
| Economic loss: Rp213–551 trillion/year | Bappenas |
| Emissions: ~1,702.9 Mt CO2e over 2000–2019 | Bappenas |

**Presentation rule:** these establish the size of the problem. A platform that rescued 1 tonne has addressed roughly 0.000004% of it. Any framing that implies otherwise is dishonest and would not survive a numerate judge.

Semarang-specific context — TPA Jatibarang's BSF operation and TPST Gemah receiving restaurant and shop waste for maggot farming — supports a stronger and more defensible claim: **the ecosystem already exists; Cirquo digitises and coordinates it.**

---

## 12. Q&A Preparation

| Question | Answer |
|---|---|
| *"How do you know rescued food would have been wasted?"* | We don't, with certainty. It is stated assumption A1. What we measure is that surplus was listed as unsellable by the merchant and subsequently collected by a consumer. The counterfactual is an assumption; the transaction is a fact. |
| *"Where does 2.5 kg CO2e/kg come from?"* | Two components: avoided anaerobic landfill decomposition using IPCC GWP100 for methane, and avoided replacement food production from published food-system LCA ranges. It is conservative — some sources cite 4–6. We chose the defensible end. |
| *"Why is recovery worth less than rescue?"* | Recovered food avoids landfill emissions but nobody ate it, so no food production is displaced. The 2.8× ratio encodes our priority: people first, processing second. |
| *"Can you sell these as carbon credits?"* | No. Limitation L9. These figures are not registry-approved and have not been independently verified. We say so in our documentation. |
| *"What if merchants lie about weight?"* | Assumption A3, our weakest. Mitigations: plausible-range validation, and preferring processor-measured intake weight over merchant-declared weight whenever both exist. We store both and surface the variance. |
| *"Why 93% and not 100%?"* | Because 100% is not achievable. Contamination, transport failures, and processor capacity limits guarantee residual. We report the 7% rather than hide it, and we can show you exactly which items it came from. |

---

## 13. Future Improvements

| # | Improvement | Phase | Effect |
|---|---|---|---|
| 1 | Indonesia-specific emission factors from national research | 2 | Higher accuracy |
| 2 | Third-party methodology review | 3 | Credibility for ESG buyers |
| 3 | Weight calibration from declared-vs-measured variance | 2 | Addresses A3 |
| 4 | Credit compost/BSF output displacement | 3 | Would raise `EF_recovery` |
| 5 | Include transport emissions | 3 | Would lower both factors slightly |
| 6 | Per-category emission factors | 3 | Meat vs. produce differ substantially |
| 7 | Registry-aligned methodology | 5 | Prerequisite for carbon credits |

Improvements 1 and 3 are the highest value: they address the two weakest assumptions rather than adding precision to already-defensible parts of the model.

---

## Related Documents

- [MATERIAL_LEDGER.md](MATERIAL_LEDGER.md) — Event log all metrics derive from
- [ALGORITHM.md](ALGORITHM.md) — `summariseLedger` and `estimateCo2e` implementations
- [DOMAIN.md](../domain/DOMAIN.md) — Conservation invariant
- [DATABASE.md](../domain/DATABASE.md) — `methodologyVersion` field
- [BUSINESS.md](../business/BUSINESS.md) — KPI definitions, carbon-credit speculation
- [RISKS.md](../business/RISKS.md) — IMP-01 to IMP-04, prepared Q&A defences
- [VISION.md](../product/VISION.md) — Long-term impact targets
- [UI_GUIDE.md](../design/UI_GUIDE.md) — How estimates are labelled in the interface

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
