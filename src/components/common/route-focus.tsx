import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteFocus() {
  const { pathname } = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>("main")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
