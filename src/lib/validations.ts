import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Kata sandi harus diisi" }),
});

export const registerSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter" }).max(80, { message: "Nama maksimal 80 karakter" }),
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z
    .string()
    .min(8, { message: "Kata sandi minimal 8 karakter" })
    .max(128, { message: "Kata sandi maksimal 128 karakter" })
    .regex(/[A-Za-z]/, { message: "Harus mengandung huruf" })
    .regex(/[0-9]/, { message: "Harus mengandung angka" }),
});

export const merchantOnboardingSchema = z.object({
  legalName: z.string().min(3, { message: "Nama legal minimal 3 karakter" }),
  registrationNumber: z.string().min(3, { message: "Nomor izin usaha wajib diisi" }),
  address: z.string().min(10, { message: "Alamat harus lengkap (minimal 10 karakter)" }),
  // capacity is for processors only
});

export const processorOnboardingSchema = merchantOnboardingSchema.extend({
  capacityGrams: z.number().min(1000, { message: "Kapasitas minimal 1kg" }),
});
