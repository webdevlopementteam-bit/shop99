// components/SEO.jsx
//
// Rendered exactly once, permanently, in App.jsx — never per-page. Each page
// used to render its own <SEO page="X">, which meant a totally different
// component instance had to unmount (old page) and mount (new page) on every
// navigation. React 19's native title/meta/link hoisting didn't always
// finish cleaning up the old instance's tags before the new instance's tags
// landed, so the canonical/title shown right after a client-side route
// change could be the *previous* page's (fixed only by a hard refresh).
// A single always-mounted instance that just re-renders with new content on
// each navigation avoids that unmount/mount race entirely.

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSEOByPageApi } from "../api/api";
import { usePreloadedSeo } from "../context/PreloadedSeoContext";
import { resolveSeoPageKey } from "../utils/seoPageKey";

const cache = {};
const SITE_URL = "https://www.shop99.co.in";

const SEO = () => {
  const location = useLocation();
  const { page, canonicalSearch } = resolveSeoPageKey(
    location.pathname,
    new URLSearchParams(location.search),
  );

  const preloadedSeo = usePreloadedSeo();
  /** Only trust the preload if it's actually for this page — a client-side
   * nav to a different page leaves the previous request's preload behind. */
  const hasMatchingPreload = !!preloadedSeo && preloadedSeo.page === page;

  const [seo, setSeo] = useState(() => {
    if (hasMatchingPreload) return preloadedSeo.data;
    return (page && cache[page]) ?? null;
  });

  useEffect(() => {
    if (!page) {
      setSeo(null);
      return;
    }

    if (hasMatchingPreload) {
      // Server already fetched the right row and it's in state above —
      // seed the cache for any later client-side nav back to this page,
      // no need to re-fetch immediately after hydration.
      cache[page] = preloadedSeo.data;
      setSeo(preloadedSeo.data);
      return;
    }

    if (cache[page]) {
      setSeo(cache[page]);
      return;
    }

    setSeo(null);
    (async () => {
      try {
        let res = await getSEOByPageApi(page);
        if (
          res == null &&
          page !== "shop" &&
          String(page).startsWith("shop-category-")
        ) {
          res = await getSEOByPageApi("shop");
        }
        cache[page] = res;
        setSeo(res);
      } catch {
        setSeo(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMatchingPreload]);

  // Routes with their own dedicated tags (product detail, blog detail) —
  // render nothing here so we never end up with two canonicals.
  if (page == null) return null;

  return (
    <>
      <title>{seo?.meta_title || "Default Title"}</title>

      <meta
        name="description"
        content={seo?.meta_description || "Default description"}
      />

      <meta name="keywords" content={seo?.meta_keywords || ""} />

      {/* Always self-referencing and code-computed — never trust the admin-typed
          canonical_url field here. It's free text and has drifted wrong before
          (missing www, a stale staging domain, even another page's URL).
          `canonicalSearch` (from resolveSeoPageKey) opts a route into a
          *specific* query string (e.g. Shop's ?category=) when different
          query values are genuinely different content — plain pathname
          would otherwise collapse every category/filter variant onto the
          same canonical. */}
      <link
        rel="canonical"
        href={`${SITE_URL}${location.pathname}${canonicalSearch}`}
      />

      {/* OG */}
      <meta property="og:title" content={seo?.og_title || ""} />
      <meta property="og:description" content={seo?.og_description || ""} />
      {seo?.og_image && (
        <meta
          property="og:image"
          content={`https://api.shop99.co.in/uploads/${seo.og_image}`}
        />
      )}
    </>
  );
};

export default SEO;
