import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calculator } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAppError } from "@/lib/errors";
import { MATERIAL_TYPES, suggestRescuePrice } from "@/lib/pricing";

const materialTypes = [
  { value: "prepared_food", label: "Makanan matang" },
  { value: "bakery", label: "Roti & pastry" },
  { value: "produce", label: "Sayur & buah" },
  { value: "dairy", label: "Produk susu" },
  { value: "protein", label: "Daging, ikan, atau telur" },
  { value: "dry_goods", label: "Bahan pangan kering" },
  { value: "mixed", label: "Campuran" },
] as const;

const dietaryOptions = [
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "dairy-free", label: "Bebas susu" },
  { value: "nut-free", label: "Bebas kacang" },
] as const;

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const schema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter.")
      .max(120, "Nama maksimal 120 karakter."),
    description: z.string().max(500, "Deskripsi maksimal 500 karakter."),
    imageUrl: z.string().url("Masukkan URL gambar yang valid.").or(z.literal("")),
    materialType: z.enum(MATERIAL_TYPES),
    dietaryTags: z.array(z.string()),
    quantity: z.number().int().min(1, "Jumlah minimal 1 unit."),
    weight: z.number().int().min(1, "Berat minimal 1 gram."),
    originalPrice: z.number().int().min(1, "Harga awal minimal Rp1."),
    floorPrice: z.number().int().min(1, "Floor price minimal Rp1."),
    rescuePrice: z.number().int().min(1, "Harga rescue minimal Rp1."),
    pickupStart: z.string().min(1, "Waktu mulai wajib diisi."),
    pickupEnd: z.string().min(1, "Waktu selesai wajib diisi."),
  })
  .refine((data) => data.rescuePrice < data.originalPrice, {
    path: ["rescuePrice"],
    message: "Harga rescue harus lebih rendah dari harga awal.",
  })
  .refine((data) => data.floorPrice < data.originalPrice, {
    path: ["floorPrice"],
    message: "Floor price harus lebih rendah dari harga awal.",
  })
  .refine((data) => data.rescuePrice >= data.floorPrice, {
    path: ["rescuePrice"],
    message: "Harga rescue tidak boleh di bawah floor price.",
  })
  .refine((data) => toTimestamp(data.pickupEnd) > toTimestamp(data.pickupStart), {
    path: ["pickupEnd"],
    message: "Waktu selesai harus setelah waktu mulai.",
  })
  .refine((data) => toTimestamp(data.pickupStart) > Date.now(), {
    path: ["pickupStart"],
    message: "Waktu mulai harus setelah waktu sekarang.",
  })
  .refine(
    (data) =>
      toTimestamp(data.pickupEnd) - toTimestamp(data.pickupStart) <=
      72 * 60 * 60 * 1_000,
    {
      path: ["pickupEnd"],
      message: "Waktu pickup maksimal 72 jam.",
    },
  );

const serverFieldMap = {
  name: "name",
  description: "description",
  imageUrl: "imageUrl",
  materialType: "materialType",
  dietaryTags: "dietaryTags",
  originalPrice: "originalPrice",
  floorPrice: "floorPrice",
  currentPrice: "rescuePrice",
  initialQuantity: "quantity",
  weightPerItemGrams: "weight",
  pickupStartAt: "pickupStart",
  pickupEndAt: "pickupEnd",
} as const;

type FormValues = z.infer<typeof schema>;
type SubmitAction = "draft" | "publish";

function getSubmitAction(event: unknown): SubmitAction {
  return event instanceof SubmitEvent && event.submitter?.getAttribute("value") === "publish"
    ? "publish"
    : "draft";
}

function getDefaultValues(): FormValues {
  const pickupStart = getDefaultDatetime(1);
  const pickupEnd = getDefaultDatetime(4);
  const originalPrice = 36_000;
  const floorPrice = 12_000;
  const quantity = 4;

  return {
    name: "",
    description: "",
    imageUrl: "",
    materialType: "bakery",
    dietaryTags: ["vegetarian"],
    quantity,
    weight: 450,
    originalPrice,
    floorPrice,
    rescuePrice: suggestRescuePrice({
      originalPrice,
      floorPrice,
      pickupStartAt: toTimestamp(pickupStart),
      pickupEndAt: toTimestamp(pickupEnd),
      now: Date.now(),
      initialQuantity: quantity,
      remainingQuantity: quantity,
      materialType: "bakery",
    }).suggestedPrice,
    pickupStart,
    pickupEnd,
  };
}

function toTimestamp(dateTimeLocalStr: string) {
  return new Date(dateTimeLocalStr).getTime();
}

function getDefaultDatetime(offsetHours: number) {
  const d = new Date();
  d.setHours(d.getHours() + offsetHours);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateSurplusPage() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const createItem = useMutation(api.surplusItems.create);
  const publishItem = useMutation(api.surplusItems.publish);
  const [submitAction, setSubmitAction] = useState<SubmitAction>("draft");
  const [hasManualPrice, setHasManualPrice] = useState(false);
  const defaultValues = useMemo(getDefaultValues, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const originalPrice =
    useWatch({ control: form.control, name: "originalPrice" }) || 0;
  const rescuePrice =
    useWatch({ control: form.control, name: "rescuePrice" }) || 0;
  const floorPrice =
    useWatch({ control: form.control, name: "floorPrice" }) || 0;
  const materialType = useWatch({
    control: form.control,
    name: "materialType",
  });
  const quantity = useWatch({ control: form.control, name: "quantity" }) || 0;
  const pickupStart = useWatch({
    control: form.control,
    name: "pickupStart",
  });
  const pickupEnd = useWatch({
    control: form.control,
    name: "pickupEnd",
  });
  const discount =
    originalPrice > 0 ? Math.round((1 - rescuePrice / originalPrice) * 100) : 0;
  const suggestion = useMemo(() => {
    const pickupStartAt = toTimestamp(pickupStart);
    const pickupEndAt = toTimestamp(pickupEnd);

    return suggestRescuePrice({
      originalPrice,
      floorPrice,
      pickupStartAt,
      pickupEndAt,
      now: Date.now(),
      initialQuantity: quantity,
      remainingQuantity: quantity,
      materialType: materialType ?? "mixed",
    });
  }, [
    floorPrice,
    materialType,
    originalPrice,
    pickupEnd,
    pickupStart,
    quantity,
  ]);

  useEffect(() => {
    if (!hasManualPrice) {
      form.setValue("rescuePrice", suggestion.suggestedPrice, {
        shouldValidate: true,
      });
    }
  }, [form, hasManualPrice, suggestion.suggestedPrice]);

  const onSubmit = async (data: FormValues, action: SubmitAction) => {
    setSubmitAction(action);

    try {
      const itemId = await createItem({
        name: data.name,
        description: data.description || undefined,
        imageUrl: data.imageUrl || undefined,
        originalPrice: data.originalPrice,
        floorPrice: data.floorPrice,
        currentPrice: data.rescuePrice,
        initialQuantity: data.quantity,
        weightPerItemGrams: data.weight,
        pickupStartAt: toTimestamp(data.pickupStart),
        pickupEndAt: toTimestamp(data.pickupEnd),
        materialType: data.materialType,
        dietaryTags: data.dietaryTags,
        sessionToken: sessionToken || undefined,
      });

      if (action === "publish") {
        await publishItem({ id: itemId, sessionToken: sessionToken || undefined });
        toast.success("Rescue Item berhasil diterbitkan.");
      } else {
        toast.success("Rescue Item disimpan sebagai draft.");
      }
      navigate("/merchant/surplus");
    } catch (error: unknown) {
      const appError = getAppError(error, "Gagal menyimpan Rescue Item.");
      const field = appError.field
        ? serverFieldMap[appError.field as keyof typeof serverFieldMap]
        : undefined;

      if (field) {
        form.setError(field, { type: "server", message: appError.message });
      }
      toast.error(appError.message);
    }
  };

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3">
        <Link to="/merchant/surplus">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <PageHeader
        title="Buat Rescue Item"
        description="Satu form singkat untuk memasukkan surplus hari ini ke alur Cirquo."
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data, event) =>
            onSubmit(data, getSubmitAction(event?.nativeEvent)),
          )}
          className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
          aria-busy={form.formState.isSubmitting}
        >
          <div className="space-y-6 rounded-xl bg-card p-5 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] sm:p-6">
            <section aria-labelledby="item-section">
              <h2 id="item-section" className="text-lg font-semibold">
                Informasi paket
              </h2>
              <div className="mt-5 space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Rescue Item</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: Roti artisan sore hari"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi isi dan kondisi</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Jelaskan isi paket dan kapan makanan dibuat."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Gunakan informasi faktual; isi akhir boleh menyesuaikan
                        stok yang tersisa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis material</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis material" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materialTypes.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Dipakai untuk pricing dan kecocokan processor.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL gambar Rescue Item (opsional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          inputMode="url"
                          placeholder="https://contoh.com/roti.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Masukkan URL gambar; unggah file belum tersedia.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dietaryTags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Preferensi pangan yang dideklarasikan
                      </FormLabel>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {dietaryOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={field.value.includes(option.value)}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.checked
                                    ? [...field.value, option.value]
                                    : field.value.filter(
                                        (value) => value !== option.value,
                                      ),
                                )
                              }
                              className="size-4 accent-primary"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                      <FormDescription>
                        Berdasarkan deklarasi merchant, bukan jaminan keamanan
                        alergi atau bebas kontaminasi silang.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            <section
              aria-labelledby="quantity-section"
              className="border-t pt-6"
            >
              <h2 id="quantity-section" className="text-lg font-semibold">
                Jumlah dan harga
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Berat wajib akurat karena menjadi dasar Material Flow Ledger dan
                seluruh angka dampak.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah unit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berat per unit (gram)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga awal (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floorPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor price (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Batas minimum yang tidak boleh dilewati pricing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rescuePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga rescue (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...field}
                          onChange={(event) => {
                            setHasManualPrice(true);
                            field.onChange(event.target.valueAsNumber);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {hasManualPrice
                          ? "Harga manual tidak akan diubah hingga kamu memilih saran pricing."
                          : "Harga mengikuti saran pricing dan tetap bisa diubah."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            <section aria-labelledby="pickup-section" className="border-t pt-6">
              <h2 id="pickup-section" className="text-lg font-semibold">
                Waktu pickup hari ini
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pickupStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mulai</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pickupEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selesai</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </div>
          <aside className="sticky top-28 rounded-xl bg-secondary p-5" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Calculator className="size-4" />
              Pratinjau harga
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Harga tampil ke konsumen
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
              {formatIdr(rescuePrice)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <s>{formatIdr(originalPrice)}</s> · hemat {Math.max(0, discount)}%
            </p>
            <div className="mt-5 border-t border-primary/15 pt-5 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">
                Saran awal: {formatIdr(suggestion.suggestedPrice)}
              </p>
              <p className="mt-2">
                {Math.round(suggestion.breakdown.base * 100)}% dasar material +{" "}
                {Math.round(suggestion.breakdown.urgency * 100)}% urgensi +{" "}
                {Math.round(suggestion.breakdown.stockPressure * 100)}% tekanan
                stok.
              </p>
              {suggestion.clampedByFloor ? (
                <p className="mt-2 text-primary">
                  Saran dibatasi oleh floor price merchant.
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                disabled={floorPrice >= originalPrice}
                onClick={() => {
                  setHasManualPrice(false);
                  form.setValue("rescuePrice", suggestion.suggestedPrice, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                Gunakan saran pricing
              </Button>
              <p className="mt-4 border-t border-primary/15 pt-4">
                Harga dapat diubah Merchant. Server tetap memvalidasi floor
                price dan harga diskon saat disimpan.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="submit"
                name="action"
                value="publish"
                className="w-full"
                disabled={form.formState.isSubmitting}
                onClick={() => setSubmitAction("publish")}
              >
                {form.formState.isSubmitting && submitAction === "publish" ? "Menerbitkan..." : "Terbitkan Sekarang"}
              </Button>
              <Button
                type="submit"
                name="action"
                value="draft"
                variant="outline"
                className="w-full"
                disabled={form.formState.isSubmitting}
                onClick={() => setSubmitAction("draft")}
              >
                {form.formState.isSubmitting && submitAction === "draft" ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            </div>
          </aside>
        </form>
      </Form>
    </>
  );
}
