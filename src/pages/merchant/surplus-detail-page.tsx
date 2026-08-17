import { ArrowLeft, Clock3, MoreHorizontal, Scale } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { formatIdr, formatKg, rescueItems } from "@/constants/mock-data";

export default function SurplusDetailPage() {
  const { id } = useParams();
  const item = rescueItems.find(
    (candidate) =>
      candidate.id === id && candidate.merchantName === "Roti Tembalang",
  );
  if (!item) return <PageHeader title="Rescue Item tidak ditemukan" />;
  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3">
        <Link to="/merchant/surplus">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <PageHeader
        title={item.name}
        description={`${item.merchantName} · dibuat sebagai data demo`}
        action={
          <Button
            variant="outline"
            onClick={() => toast.info("Menu edit tersedia setelah backend M2.")}
          >
            <MoreHorizontal />
            Kelola
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <div className="flex gap-4">
            <img
              src={item.image}
              alt=""
              className="size-24 rounded-xl object-cover"
            />
            <div>
              <StatusBadge status={item.status} />
              <p className="mt-3 text-2xl font-semibold">
                {formatIdr(item.currentPrice)}
              </p>
              <p className="text-sm text-muted-foreground">
                <s>{formatIdr(item.originalPrice)}</s>
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Stok tersisa</dt>
              <dd className="mt-1 font-semibold">
                {item.remainingQuantity} unit
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Berat per unit</dt>
              <dd className="mt-1 font-semibold">
                {formatKg(item.weightPerItemGrams)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pickup</dt>
              <dd className="mt-1 font-semibold">{item.pickupWindow}</dd>
            </div>
          </dl>
        </section>
        <aside className="rounded-xl bg-secondary p-5">
          <h2 className="font-semibold">Alur hari ini</h2>
          <ol className="mt-5 space-y-5">
            {[
              {
                icon: Scale,
                label: "Berat tercatat",
                value: formatKg(
                  item.weightPerItemGrams * (item.remainingQuantity || 1),
                ),
              },
              {
                icon: Clock3,
                label: "Pickup window",
                value: item.pickupWindow,
              },
            ].map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-background text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-primary/15 pt-4 text-xs leading-relaxed text-muted-foreground">
            Event ledger belum tersedia pada scaffold. Timeline ini hanya
            memvalidasi tampilan.
          </p>
        </aside>
      </div>
    </>
  );
}
