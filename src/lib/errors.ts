import { ConvexError } from "convex/values";

export type AppError = {
  code?: string;
  field?: string;
  message: string;
};

const messages: Record<string, string> = {
  ACCOUNT_SUSPENDED: "Akun ini sedang ditangguhkan.",
  AUTH_REQUIRED: "Sesi tidak tersedia. Silakan masuk kembali.",
  EMAIL_ALREADY_REGISTERED: "Email ini sudah terdaftar.",
  FORBIDDEN: "Akun ini tidak memiliki izin untuk tindakan tersebut.",
  INVALID_CREDENTIALS: "Email atau kata sandi tidak sesuai.",
  PROFILE_ALREADY_EXISTS: "Profil usaha sudah tersedia.",
  SESSION_EXPIRED: "Sesi telah berakhir. Silakan masuk kembali.",
  VALIDATION_FAILED: "Periksa kembali data yang kamu masukkan.",
};

function convexData(error: unknown): unknown {
  if (error instanceof ConvexError) return error.data;
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    return error.data;
  }
  return undefined;
}

export function getAppError(error: unknown, fallback: string): AppError {
  const data = convexData(error);

  if (typeof data === "string") {
    return { code: data, message: messages[data] ?? fallback };
  }
  if (typeof data === "object" && data !== null) {
    const value = data as Record<string, unknown>;
    const code = typeof value.code === "string" ? value.code : undefined;
    const field = typeof value.field === "string" ? value.field : undefined;
    const serverMessage =
      typeof value.message === "string" ? value.message : undefined;

    return {
      code,
      field,
      message: serverMessage || (code && messages[code]) || fallback,
    };
  }

  return { message: fallback };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return getAppError(error, fallback).message;
}
