import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatIdr, orders } from "@/constants/mock-data";

function OrderList({ status }: { status: "active" | "history" }) {
  const list = orders.filter((order) =>
    status === "active"
      ? order.status === "paid" || order.status === "reserved"
      : order.status !== "paid" && order.status !== "reserved",
  );
  return (
    <div className="space-y-4">
      {list.map((order) => (
        <article
          key={order.id}
          className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-xl bg-card p-3 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] sm:grid-cols-[7rem_1fr_auto] sm:items-center"
        >
          <img
            src={order.image}
            alt=""
            className="aspect-square size-full rounded-lg object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="text-xs text-muted-foreground">
                {order.quantity} paket
              </span>
            </div>
            <h2 className="mt-2 truncate font-semibold">{order.itemName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {order.merchantName}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              {order.pickupWindow}
            </p>
          </div>
          <div className="col-span-2 flex items-center justify-between border-t pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <p className="font-semibold">{formatIdr(order.totalPrice)}</p>
            <Button asChild variant="ghost" size="sm" className="mt-1">
              <Link to={`/orders/${order.id}`}>
                Detail <ArrowRight />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Pesananmu"
        description="Simpan kode pickup dan ambil langsung di merchant pada waktu yang tertera."
      />
      <Tabs defaultValue="active">
        <TabsList className="mb-5 h-11">
          <TabsTrigger value="active" className="min-h-9">
            Aktif
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-9">
            Riwayat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <OrderList status="active" />
        </TabsContent>
        <TabsContent value="history">
          <OrderList status="history" />
        </TabsContent>
      </Tabs>
    </>
  );
}
