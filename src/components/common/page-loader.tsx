export function PageLoader() {
  return (
    <div className="grid min-h-64 place-items-center" role="status">
      <div className="text-center">
        <span className="mx-auto block size-8 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat halaman…</p>
      </div>
    </div>
  );
}
