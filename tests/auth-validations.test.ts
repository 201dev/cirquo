import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import {
  merchantOnboardingSchema,
  processorOnboardingSchema,
  registerSchema,
  timeToMinutes,
} from "../src/lib/validations";
import { validateRegistrationInput } from "../convex/lib/auth";
import {
  validateMerchantProfile,
  validateProcessorProfile,
} from "../convex/lib/profiles";
import { hashPassword, verifyPassword } from "../convex/lib/password";
import { resolveAuth } from "../convex/lib/guards";
import { generateSessionToken } from "../convex/lib/tokens";
import { clearToken, loadToken, saveToken } from "../src/lib/auth-storage";
import { getAppError } from "../src/lib/errors";
import { homeForRole, safeReturnTo } from "../src/lib/role-home";

describe("validasi akun", () => {
  test("setiap peran memiliki halaman tujuan yang aman", () => {
    expect(homeForRole("consumer")).toBe("/discover");
    expect(homeForRole("merchant")).toBe("/merchant");
    expect(homeForRole("processor")).toBe("/processor");
    expect(homeForRole("admin")).toBe("/admin");
  });

  test("returnTo hanya menerima path internal", () => {
    expect(safeReturnTo("/merchant/surplus?status=draft")).toBe(
      "/merchant/surplus?status=draft",
    );
    expect(safeReturnTo("https://contoh.test")).toBeNull();
    expect(safeReturnTo("//contoh.test")).toBeNull();
  });

  test("token sesi web bertahan sampai logout", async () => {
    const originalStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    const values = new Map<string, string>();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    try {
      await saveToken("test-session-token");
      expect(await loadToken()).toBe("test-session-token");

      await clearToken();
      expect(await loadToken()).toBeNull();
    } finally {
      if (originalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalStorage);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });

  test("sesi kedaluwarsa tidak dipulihkan", async () => {
    const context = {
      db: {
        query: () => ({
          withIndex: () => ({
            unique: async () => ({ expiresAt: Date.now() - 1 }),
          }),
        }),
      },
    };

    expect(await resolveAuth(context as never, generateSessionToken())).toBeNull();
  });

  test("menolak kata sandi di bawah 10 karakter", () => {
    const result = registerSchema.safeParse({
      name: "Zaki",
      email: "zaki@example.com",
      password: "abc123456",
    });

    expect(result.success).toBe(false);
  });

  test("menerima kata sandi 10 karakter yang memiliki huruf dan angka", () => {
    const input = {
      name: "Zaki",
      email: "ZAKI@example.com",
      password: "abc1234567",
    };

    expect(registerSchema.safeParse(input).success).toBe(true);
    expect(validateRegistrationInput(input.name, input.email, input.password)).toEqual({
      name: "Zaki",
      email: "zaki@example.com",
    });
  });

  test("hash kata sandi hanya cocok dengan kata sandi asal", () => {
    const hash = hashPassword("CirquoM106123");

    expect(verifyPassword("CirquoM106123", hash)).toBe(true);
    expect(verifyPassword("KataSandiSalah123", hash)).toBe(false);
  });

  test("error server mempertahankan field dan pesan Bahasa Indonesia", () => {
    const error = new ConvexError({
      code: "VALIDATION_FAILED",
      field: "email",
      message: "Format email tidak valid.",
    });

    expect(getAppError(error, "Gagal")).toEqual({
      code: "VALIDATION_FAILED",
      field: "email",
      message: "Format email tidak valid.",
    });
  });
});

describe("validasi profil bisnis", () => {
  test("profil Merchant memakai batas yang sama di client dan server", () => {
    const merchant = {
      name: "Roti Tembalang",
      businessType: "bakery" as const,
      address: "Jl. Prof. Soedarto, Semarang",
      city: "Semarang",
      latitude: -7.052,
      longitude: 110.44,
      phone: "081234567890",
    };

    expect(merchantOnboardingSchema.safeParse(merchant).success).toBe(true);
    expect(validateMerchantProfile(merchant)).toMatchObject({
      name: merchant.name,
      city: merchant.city,
    });
  });

  test("profil Processor menolak material kosong dan jam terbalik", () => {
    const processor = {
      name: "Kompos Semarang",
      facilityType: "composting" as const,
      city: "Semarang",
      latitude: -7.01,
      longitude: 110.42,
      acceptedMaterialTypes: [],
      dailyCapacityGrams: 100_000,
      maxPickupRadiusMeters: 15_000,
      outputTypes: ["compost" as const],
      operatingHoursStart: "17:00",
      operatingHoursEnd: "08:00",
    };

    expect(processorOnboardingSchema.safeParse(processor).success).toBe(false);
  });

  test("profil Processor valid mempertahankan gram, meter, dan menit", () => {
    const processor = {
      name: "Kompos Semarang",
      facilityType: "composting" as const,
      city: "Semarang",
      latitude: -7.01,
      longitude: 110.42,
      acceptedMaterialTypes: ["produce" as const],
      dailyCapacityGrams: 100_000,
      maxPickupRadiusMeters: 15_000,
      outputTypes: ["compost" as const],
      operatingHoursStart: "08:00",
      operatingHoursEnd: "17:00",
    };

    expect(processorOnboardingSchema.safeParse(processor).success).toBe(true);
    expect(
      validateProcessorProfile({
        ...processor,
        operatingHoursStart: timeToMinutes(processor.operatingHoursStart),
        operatingHoursEnd: timeToMinutes(processor.operatingHoursEnd),
      }),
    ).toMatchObject({ name: processor.name, city: processor.city });

    expect(
      processorOnboardingSchema.safeParse({
        ...processor,
        dailyCapacityGrams: 0,
        maxPickupRadiusMeters: 1_000,
      }).success,
    ).toBe(true);
  });
});
