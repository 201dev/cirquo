/**
 * On-demand loader for Midtrans Snap (Sandbox).
 *
 * The script is fetched the first time a Consumer actually starts a payment, not
 * on page mount, so nothing third-party is pulled in until checkout is
 * initiated. A failed load resets the cached promise so the retry button works.
 */

type SnapResult = Record<string, unknown>;

type SnapCallbacks = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

type SnapApi = {
  pay: (token: string, callbacks: SnapCallbacks) => void;
};

declare global {
  interface Window {
    snap?: SnapApi;
  }
}

const SNAP_SCRIPT_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

export class SnapUnavailableError extends Error {}

let loader: Promise<SnapApi> | null = null;

export function loadMidtransSnap(): Promise<SnapApi> {
  if (window.snap) return Promise.resolve(window.snap);
  if (loader) return loader;

  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
  if (!clientKey) {
    return Promise.reject(
      new SnapUnavailableError("VITE_MIDTRANS_CLIENT_KEY belum dikonfigurasi."),
    );
  }

  loader = new Promise<SnapApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);

    script.addEventListener("load", () => {
      if (window.snap) {
        resolve(window.snap);
        return;
      }
      loader = null;
      script.remove();
      reject(new SnapUnavailableError("Snap tidak tersedia setelah dimuat."));
    });

    script.addEventListener("error", () => {
      loader = null;
      script.remove();
      reject(new SnapUnavailableError("Skrip pembayaran gagal dimuat."));
    });

    document.head.appendChild(script);
  });

  return loader;
}
