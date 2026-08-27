import { ArrowLeft, Clock3, Scale } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const pickupFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatPickupWindow(startAt: number, endAt: number) {
  return `${pickupFormatter.format(new Date(startAt))}–${pickupFormatter.format(new Date(endAt))}`;
}

export default function SurplusDetailPage() {
  const { id } = useParams();
  const { sessionToken } = useAuth();
  const merchantItems = useQuery(
    api.surplusItems.listMine,
    sessionToken ? { sessionToken } : "skip",
  );

  if (merchantItems === undefined) {
    return (
      <>
        <PageHeader title="Memuat Rescue Item" />
        <div role="status" className="space-y-3 rounded-xl bg-card p-5">
          <span className="sr-only">Memuat detail Rescue Item...</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  }

  const item = merchantItems.find((candidate) => candidate._id === id);
  if (!item) return <PageHeader title="Rescue Item tidak ditemukan" />;

  const pickupWindow = formatPickupWindow(item.pickupStartAt, item.pickupEndAt);

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
        description={
          item.processingOnly
            ? "Rescue Item khusus Organic Processor."
            : "Rescue Item yang dikelola Merchant."
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <StatusBadge status={item.status} />
          <p className="mt-4 text-2xl font-semibold">
            {formatIdr(item.currentPrice)}
          </p>
          <p className="text-sm text-muted-foreground">
            <s>{formatIdr(item.originalPrice)}</s>
          </p>
          <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Stok tersisa</dt>
              <dd className="mt-1 font-semibold">
                {item.remainingQuantity} dari {item.initialQuantity} unit
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pickup</dt>
              <dd className="mt-1 font-semibold">{pickupWindow}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Diterbitkan</dt>
              <dd className="mt-1 font-semibold">
                {item.publishedAt
                  ? pickupFormatter.format(new Date(item.publishedAt))
                  : "Masih draf"}
              </dd>
            </div>
          </dl>
        </section>
        <aside className="rounded-xl bg-secondary p-5">
          <h2 className="font-semibold">Ringkasan</h2>
          <dl className="mt-5 space-y-5">
            <div className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-background text-primary">
                <Scale className="size-4" />
              </span>
              <div>
                <dt className="text-xs text-muted-foreground">Stok tersedia</dt>
                <dd className="text-sm font-semibold">
                  {item.remainingQuantity} unit
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-background text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <dt className="text-xs text-muted-foreground">Waktu pickup</dt>
                <dd className="text-sm font-semibold">{pickupWindow}</dd>
              </div>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
