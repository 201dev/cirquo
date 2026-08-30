import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function RouteFocus() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  /**
   * On a fresh document load focus already starts above the shell, where the
   * skip link is the first Tab stop. Pulling focus into <main> there would put
   * the skip link — and the header behind it — out of forward tab reach, so only
   * an actual route change moves focus. Comparing pathnames rather than a
   * "first run" flag keeps this correct under StrictMode's double-invoked mount.
   */
  const handledPath = useRef(pathname);

  useEffect(() => {
    if (handledPath.current === pathname) return;
    handledPath.current = pathname;

    /**
     * A pushState navigation keeps the old scroll offset, so opening a page from
     * halfway down a long list drops the reader into the middle of the new one.
     * Back and forward are left alone: the browser restores their real position,
     * and overriding it would lose the spot the reader came from. Search-param
     * changes never reach here, so re-filtering a list does not yank the page.
     */
    if (navigationType !== "POP") window.scrollTo({ top: 0, left: 0 });

    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>("main")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [navigationType, pathname]);

  return null;
}
