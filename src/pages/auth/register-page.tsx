import { ArrowRight, Recycle, ShoppingBag, Store } from "lucide-react";
import { Link } from "react-router-dom";

const roles = [
  {
    title: "Consumer",
    description: "Temukan makanan surplus dan ambil langsung di merchant.",
    icon: ShoppingBag,
    href: "/register/consumer",
  },
  {
    title: "Merchant",
    description: "Catat surplus, terima reservasi, dan pulihkan nilainya.",
    icon: Store,
    href: "/register/merchant",
  },
  {
    title: "Organic Processor",
    description: "Terima Circular Routing dan catat outcome pengolahan.",
    icon: Recycle,
    href: "/register/processor",
  },
];

export default function RegisterPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Mulai di Cirquo</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
        Kamu akan menggunakan Cirquo sebagai apa?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Pilih satu peran utama. Merchant juga tetap dapat menjelajah sebagai
        consumer.
      </p>
      <div className="mt-8 space-y-3">
        {roles.map(({ title, description, icon: Icon, href }) => (
          <Link
            key={title}
            to={href}
            className="group flex min-h-24 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <span className="flex-1">
              <strong className="block">{title}</strong>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {description}
              </span>
            </span>
            <ArrowRight className="size-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:underline"
        >
          Masuk
        </Link>
      </p>
    </>
  );
}
