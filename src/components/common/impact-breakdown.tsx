import { formatKg } from "../../lib/format";

interface ImpactBreakdownProps {
  rescuedGrams: number;
  recoveredGrams: number | null;
  residualGrams: number | null;
  inProgressGrams: number | null;
}

const segments = [
  { key: "rescuedGrams", label: "Terselamatkan", color: "bg-rescued" },
  { key: "recoveredGrams", label: "Terolah", color: "bg-recovered" },
  { key: "residualGrams", label: "Residu", color: "bg-residual" },
  { key: "inProgressGrams", label: "Dalam proses", color: "bg-in-progress" },
] as const;

export function ImpactBreakdown(props: ImpactBreakdownProps) {
  const values = segments.map((segment) => props[segment.key]);
  const hasCompleteOutcome = values.every((value) => value !== null);
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const hasMaterial = total > 0;

  return (
    <section
      aria-labelledby="material-flow-title"
      className="rounded-xl bg-foreground p-5 text-background sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="material-flow-title" className="text-base font-semibold">
            Aliran material
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-background/70">
            Setiap kilogram tetap terlihat sampai hasil akhirnya.
          </p>
        </div>
        <p
          className="text-2xl font-semibold tracking-[-0.03em]"
          aria-label={hasMaterial ? `Total aliran material ${formatKg(total)}` : "Belum ada aliran material"}
        >
          {hasMaterial ? formatKg(total) : "—"}
        </p>
      </div>
      {hasCompleteOutcome && hasMaterial ? (
        <div
          className="mt-5 flex h-3 overflow-hidden rounded-full bg-background/15"
          aria-label={`Total aliran material ${formatKg(total)}`}
        >
          {segments.map((segment) => (
            <span
              key={segment.key}
              aria-hidden="true"
              className={segment.color}
              style={{ width: `${((props[segment.key] ?? 0) / total) * 100}%` }}
            />
          ))}
        </div>
      ) : (
        <p role="status" className="mt-5 text-sm text-background/70">
          {hasCompleteOutcome
            ? "Belum ada material yang tercatat."
            : "Sebagian outcome memerlukan pemeriksaan sebelum aliran divisualkan."}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {segments.map((segment) => {
          const value = props[segment.key];
          return (
            <div key={segment.key}>
              <dt className="flex items-center gap-2 text-xs text-background/70">
                <span className={`size-2 rounded-full ${segment.color}`} />
                {segment.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {value === null ? "—" : formatKg(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
