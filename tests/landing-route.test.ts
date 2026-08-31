import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";
import { homeForRole } from "../src/lib/role-home";

const read = (path: string) => readFileSync(path, "utf8");

test("landing page owns the root route while consumer home remains reachable", () => {
  const router = read("src/app/router.tsx");

  assert.match(router, /\{ path: "\/", element: <WelcomePage \/> \}/);
  assert.doesNotMatch(router, /path: "welcome"/);
  assert.equal(homeForRole("consumer"), "/home");
});

test("consumer routes share the landing chrome in a single light theme", () => {
  const landing = read("src/pages/welcome-page.tsx");
  const consumerLayout = read("src/layouts/consumer-layout.tsx");
  const providers = read("src/app/providers.tsx");
  const styles = read("src/index.css");

  assert.match(landing, /<SiteHeader\s*\/>/);
  assert.match(landing, /<SiteFooter\s*\/>/);
  assert.match(consumerLayout, /<SiteHeader\s*\/>/);
  assert.match(consumerLayout, /<SiteFooter\s*\/>/);
  assert.doesNotMatch(providers, /ThemeProvider|next-themes/);
  assert.doesNotMatch(styles, /\.dark|@custom-variant dark/);
});

/**
 * The header, the landing page, and the consumer routes used to declare three
 * different gutters. Content staggered 4px away from its own header on mobile,
 * and `lg:px-0` dropped the gutter to zero between 1024px and the 1280px cap.
 */
test("one container recipe, and a bleed that cancels exactly that gutter", () => {
  const styles = read("src/index.css");

  const container = styles.match(/\.site-container\s*\{([^}]*)\}/)?.[1];
  const bleed = styles.match(/\.site-bleed\s*\{([^}]*)\}/)?.[1];
  assert.ok(container, ".site-container must be defined in src/index.css");
  assert.ok(bleed, ".site-bleed must be defined in src/index.css");

  const gutters = [...container.matchAll(/(?:^|\s)(?:(\w+):)?px-(\d+)/g)].map(
    (match) => `${match[1] ?? "base"}:${match[2]}`,
  );
  assert.deepEqual(
    gutters,
    ["base:4", "sm:6", "lg:8"],
    "the gutter must never collapse to zero at any breakpoint",
  );

  for (const [prefix, size] of [
    ["", "4"],
    ["sm:", "6"],
    ["lg:", "8"],
  ] as const) {
    assert.ok(
      bleed.includes(`${prefix}-mx-${size}`) && bleed.includes(`${prefix}px-${size}`),
      `.site-bleed must cancel and restore the ${prefix || "base"} gutter of ${size}`,
    );
  }

  for (const path of [
    "src/components/common/site-header.tsx",
    "src/layouts/consumer-layout.tsx",
    "src/pages/welcome-page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /site-container/, `${path} must use .site-container`);
    assert.doesNotMatch(
      source,
      /max-w-7xl px-/,
      `${path} must not hand-roll the container gutter`,
    );
  }
});

test("the header offers navigation below the lg breakpoint", () => {
  const header = read("src/components/common/site-header.tsx");

  // The landing route has no bottom tab bar to fall back on, so without this a
  // phone visitor cannot reach Jelajahi, Tentang Kami, or Download at all.
  assert.match(header, /aria-label="Buka menu navigasi"/);
  assert.match(header, /SheetTrigger/);
  assert.match(header, /lg:hidden/);

  // Sticky offsets across the app derive from this, so it stays a variable.
  assert.match(header, /h-\[var\(--site-header-h\)\]/);
  assert.match(read("src/index.css"), /--site-header-h:/);
});

test("sticky offsets derive from the header height instead of guessing it", () => {
  const explore = read("src/pages/consumer/explore-page.tsx");

  assert.match(explore, /var\(--site-header-h\)/);
  // 4.5rem was a pixel short of the old 73px header, leaving a sliver of
  // scrolled content above the filter bar; 14rem put the map under it.
  assert.doesNotMatch(explore, /top-\[4\.5rem\]/);
  assert.doesNotMatch(explore, /top-\[14rem\]/);
});

test("tab-bar clearance belongs to the layout that renders the tab bar", () => {
  const footer = read("src/components/common/site-footer.tsx");
  const consumerLayout = read("src/layouts/consumer-layout.tsx");
  const itemDetail = read("src/pages/consumer/item-detail-page.tsx");

  // SiteFooter also serves the landing route, which has no tab bar and so
  // inherited 4.5rem of dead space at the bottom of every phone screen.
  assert.doesNotMatch(footer, /4\.5rem/);
  assert.match(
    consumerLayout,
    /pb-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/,
  );
  // The bar pads itself with the safe-area inset, so anything sitting on top
  // of it has to add the inset too or the two overlap on a home-bar phone.
  assert.match(
    itemDetail,
    /bottom-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/,
  );
});

test("the landing page grows with its content instead of clipping it", () => {
  const landing = read("src/pages/welcome-page.tsx");
  const footer = read("src/components/common/site-footer.tsx");

  // The hero is `overflow-hidden`, so a fixed height cropped the heading and
  // the search bar at the widths where the text column is narrowest.
  assert.match(landing, /md:min-h-\[400px\]/);
  assert.doesNotMatch(landing, /md:h-\[400px\]/);
  assert.doesNotMatch(landing, /lg:h-\[450px\]/);

  // Four distinct reasons, not one card rendered four times.
  const titles = [...landing.matchAll(/^ {4}title: "([^"]+)"/gm)].map((m) => m[1]);
  assert.equal(titles.length, 4, "expected four 'why Cirquo' cards");
  assert.equal(new Set(titles).size, 4, "each card needs its own title");
  assert.doesNotMatch(landing, /Array\.from\(\{ length: 4 \}/);

  // A hard line break pins the copy to the one width it was authored at.
  assert.doesNotMatch(landing, /<br \/>/);
  assert.doesNotMatch(footer, /<br \/>/);

  // One search form. Two bound to the same state stacked 30px apart on mobile.
  assert.equal(landing.match(/role="search"/g)?.length, 1);
});
