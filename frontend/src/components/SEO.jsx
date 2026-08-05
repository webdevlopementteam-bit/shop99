// components/SEO.jsx

import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSEOByPageApi } from "../api/api";

const cache = {};
const SITE_URL = "https://www.shop99.co.in";

const SEO = ({ page }) => {
  const [seo, setSeo] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (!page) return;

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
  }, [page]);

  return (
    <Helmet>
      <title>{seo?.meta_title || "Default Title"}</title>

      <meta
        name="description"
        content={seo?.meta_description || "Default description"}
      />

      <meta name="keywords" content={seo?.meta_keywords || ""} />

      <link
        rel="canonical"
        href={seo?.canonical_url || `${SITE_URL}${location.pathname}`}
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
    </Helmet>
  );
};

export default SEO;