import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { demoImpact, formatIdr, orders } from "@/constants/mock-data";

export default function MerchantDashboardPage() {
  return (
    <>
      <PageHeader
        title="Selamat sore, Roti Tembalang"
        description="Prioritas hari ini: empat paket menunggu pickup sebelum pukul 19.00 WIB."
        action={
          <Button asChild>
            <Link to="/merchant/surplus/new">Buat Rescue Item</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Rescue Item aktif"
          value="2"
          description="11 paket tersedia"
          icon={<PackageCheck />}
          tone="green"
        />
        <SummaryCard
          label="Berat tercatat"
          value="5,3 kg"
          description="Data demo hari ini"
          icon={<Scale />}
        />
        <SummaryCard
          label="Pendapatan"
          value="Rp126.000"
          description="7 pesanan terbayar"
          icon={<CircleDollarSign />}
          tone="blue"
        />
      </div>
      <div className="mt-6">
        <ImpactBreakdown {...demoImpact} />
      </div>
      <section className="mt-8" aria-labelledby="pickup-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2
              id="pickup-title"
              className="text-xl font-semibold tracking-[-0.02em]"
            >
              Pickup hari ini
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Konfirmasi saat konsumen menunjukkan kode yang valid.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/merchant/pickup">
              Buka konfirmasi <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="divide-y rounded-xl bg-card px-4 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)]">
          {orders
            .filter((order) => order.status === "paid")
            .map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-4 py-4"
              >
                <img
                  src={order.image}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{order.itemName}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {order.pickupWindow}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <p className="text-sm font-semibold">
                  {formatIdr(order.totalPrice)}
                </p>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
