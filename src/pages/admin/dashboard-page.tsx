import {
  AlertTriangle,
  CircleGauge,
  Scale,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { demoImpact } from "@/constants/mock-data";

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Ringkasan platform"
        description="Pantau kesehatan alur material, mitra, dan pekerjaan yang memerlukan tinjauan."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/ledger">Buka ledger</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Aktor terdaftar"
          value="128"
          description="Data demo"
          icon={<UsersRound />}
        />
        <SummaryCard
          label="Surplus tercatat"
          value="59,8 kg"
          icon={<Scale />}
          tone="green"
        />
        <SummaryCard
          label="Circularity"
          value="93,4%"
          description="Tidak termasuk dalam proses"
          icon={<CircleGauge />}
          tone="blue"
        />
        <SummaryCard
          label="Perlu tinjauan"
          value="7"
          description="3 verifikasi · 4 moderasi"
          icon={<AlertTriangle />}
          tone="amber"
        />
      </div>
      <div className="mt-6">
        <ImpactBreakdown {...demoImpact} />
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <h2 className="text-xl font-semibold">Pekerjaan prioritas</h2>
          <div className="mt-4 divide-y rounded-xl bg-card px-4 shadow-sm">
            {[
              {
                title: "3 mitra menunggu verifikasi",
                href: "/admin/verifications",
                label: "Buka antrean",
              },
              {
                title: "4 Rescue Item ditandai",
                href: "/admin/moderation",
                label: "Tinjau konten",
              },
              {
                title: "1 sengketa pickup baru",
                href: "/admin/disputes",
                label: "Lihat sengketa",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex min-h-16 items-center gap-4"
              >
                <span className="size-2 rounded-full bg-residual" />
                <p className="flex-1 text-sm font-medium">{item.title}</p>
                <Button asChild variant="ghost" size="sm">
                  <Link to={item.href}>{item.label}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-xl bg-secondary p-5">
          <ShieldCheck className="size-8 text-primary" />
          <h2 className="mt-4 font-semibold">Guard sebelum endpoint publik</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Frontend ini masih demo. Auth, role guard, dan ownership check wajib
            aktif sebelum fungsi Convex diekspos ke client.
          </p>
        </aside>
      </section>
    </>
  );
}
