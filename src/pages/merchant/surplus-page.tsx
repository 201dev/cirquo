import { MoreHorizontal, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPickupWindow(startAt: number, endAt: number) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export default function MerchantSurplusPage() {
  const { sessionToken, user } = useAuth();
  const merchantItems = useQuery(
    api.surplusItems.listMine,
    sessionToken ? { sessionToken } : "skip",
  );

  if (merchantItems === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Memuat daftar Rescue Item...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Rescue Item"
        description={`Kelola surplus yang masuk ke alur circular ${user?.name || "merchant"}.`}
        action={
          <Button asChild>
            <Link to="/merchant/surplus/new">
              <Plus />
              Buat baru
            </Link>
          </Button>
        }
      />
      {merchantItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Belum ada Rescue Item
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat Rescue Item pertamamu untuk mulai menjual surplus.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/merchant/surplus/new">
              <Plus className="mr-2 size-4" />
              Buat baru
            </Link>
          </Button>
        </div>
      ) : (
        <>
      <div className="hidden overflow-hidden rounded-xl bg-card shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rescue Item</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantItems.map((item: any) => (
              <TableRow key={item._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="size-11 rounded-md object-cover"
                      />
                    ) : (
                      <div className="size-11 rounded-md bg-secondary/50 flex items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.weightPerItemGrams} gram / unit
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}</TableCell>
                <TableCell>{formatIdr(item.currentPrice)}</TableCell>
                <TableCell>{item.remainingQuantity}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label={`Buka ${item.name}`}
                  >
                    <Link to={`/merchant/surplus/${item._id}`}>
                      <MoreHorizontal />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {merchantItems.map((item: any) => (
          <Link
            key={item._id}
            to={`/merchant/surplus/${item._id}`}
            className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-xl bg-card p-3 shadow-sm"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="aspect-square size-full rounded-lg object-cover"
              />
            ) : (
              <div className="aspect-square size-full rounded-lg bg-secondary/50 flex items-center justify-center text-xs text-muted-foreground">
                No img
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium">{item.name}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatIdr(item.currentPrice)} · {item.remainingQuantity} sisa
              </p>
            </div>
          </Link>
        ))}
      </div>
      </>
      )}
    </>
  );
}
