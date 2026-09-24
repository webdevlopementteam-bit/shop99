// components/SEO.jsx

import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSEOByPageApi } from "../api/api";
import { usePreloadedSeo } from "../context/PreloadedSeoContext";

const cache = {};
const SITE_URL = "https://www.shop99.co.in";

const SEO = ({ page }) => {
  const location = useLocation();

  const preloadedSeo = usePreloadedSeo();
  /** Only trust the preload if it's actually for this page — a client-side
   * nav to a different page leaves the previous request's preload behind. */
  const hasMatchingPreload = !!preloadedSeo && preloadedSeo.page === page;

  const [seo, setSeo] = useState(() => {
    if (hasMatchingPreload) return preloadedSeo.data;
    return cache[page] ?? null;
  });

  useEffect(() => {
    if (!page) return;

    if (hasMatchingPreload) {
      // Server already fetched the right row and it's in state above —
      // seed the cache for any later client-side nav back to this page,
      // no need to re-fetch immediately after hydration.
      cache[page] = preloadedSeo.data;
      return;
    }

    if (cache[page]) {
      setSeo(cache[page]);
      return;
    }

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

  return (
    <Helmet>
      <title>{seo?.meta_title || "Default Title"}</title>

      <meta
        name="description"
        content={seo?.meta_description || "Default description"}
      />

      <meta name="keywords" content={seo?.meta_keywords || ""} />

      {/* Always self-referencing and code-computed — never trust the admin-typed
          canonical_url field here. It's free text and has drifted wrong before
          (missing www, a stale staging domain, even another page's URL). */}
      <link rel="canonical" href={`${SITE_URL}${location.pathname}`} />

      {/* OG */}
      <meta property="og:title" content={seo?.og_title || ""} />
      <meta property="og:description" content={seo?.og_description || ""} />
      {seo?.og_image && (
        <meta
          property="og:image"
          content={`https://api.shop99.co.in/uploads/${seo.og_image}`}
        />
      )}
    </Helmet>
  );
};

export default SEO;