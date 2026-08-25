import { ServerOff } from "lucide-react";

export function BackendRequiredNotice() {
  return (
    <div role="status" className="rounded-xl border bg-card p-5">
      <ServerOff className="size-6 text-primary" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold">Backend belum terhubung</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Jalankan <code>bunx convex dev</code>, lalu muat ulang halaman untuk
        menggunakan autentikasi Cirquo.
      </p>
    </div>
  );
}
