import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export default function OperationsPage() {
  const { sessionToken: rawSessionToken } = useAuth();
  const sessionToken = rawSessionToken ?? undefined;
  const batches = useQuery(api.recoveryBatches.adminListReroutable, sessionToken ? { sessionToken } : "skip");
  const disputes = useQuery(api.admin.listDisputes, sessionToken ? { sessionToken, status: "open" } : "skip");
  const reroute = useMutation(api.recoveryBatches.adminReroute);
  const openDispute = useMutation(api.admin.openDispute);
  const resolveDispute = useMutation(api.admin.resolveDispute);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submitDispute = async (resolve: boolean) => {
    if (!orderId.trim() || reason.trim().length < 10 || busy) return;
    setBusy(true);
    try {
      const id = orderId.trim() as never;
      if (resolve) await resolveDispute({ sessionToken: sessionToken ?? undefined, orderId: id, resolution: reason });
      else await openDispute({ sessionToken: sessionToken ?? undefined, orderId: id, reason });
      toast.success(resolve ? "Dispute ditutup." : "Dispute dibuka.");
      setOrderId(""); setReason("");
    } catch { toast.error("Operasi dispute gagal."); } finally { setBusy(false); }
  };
  return <><PageHeader title="Operasi Admin" description="Dispute order dan Circular Routing manual." /><div className="grid gap-6 lg:grid-cols-2">
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Manual reroute</h2><div className="mt-4 space-y-3">{batches?.length ? batches.map((batch) => <div key={batch._id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{batch.itemName}</p><p className="text-xs text-muted-foreground">{batch.status} · {batch.offeredWeightGrams.toLocaleString("id-ID")} g</p></div><Button size="sm" onClick={() => void reroute({ sessionToken, batchId: batch._id, reason: "Reroute manual oleh Admin untuk tindak lanjut operasional." }).then(() => toast.success("Batch dirutekan ulang.")).catch(() => toast.error("Reroute gagal."))}>Reroute</Button></div>) : <p className="text-sm text-muted-foreground">Tidak ada batch yang perlu dirutekan ulang.</p>}</div></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Dispute order</h2><div className="mt-4 space-y-3"><Input placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} /><Input placeholder="Alasan/keputusan (min. 10 karakter)" value={reason} onChange={(e) => setReason(e.target.value)} /><div className="flex gap-2"><Button disabled={busy} onClick={() => void submitDispute(false)}>Buka dispute</Button><Button variant="outline" disabled={busy || !orderId} onClick={() => void submitDispute(true)}>Tutup dispute</Button></div>{disputes?.map((dispute) => <button type="button" key={dispute._id} className="block w-full rounded-lg border p-3 text-left" onClick={() => setOrderId(dispute.orderId)}><span className="font-medium">Order {dispute.orderId}</span><span className="mt-1 block text-xs text-muted-foreground">{dispute.reason}</span></button>)}</div></section>
  </div></>;
}
