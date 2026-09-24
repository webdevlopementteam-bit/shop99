// frontend/src/utils/seoPageKey.js
//
// Single source of truth for mapping a URL (pathname + query params) to:
//  - the `page` key <SEO> looks up in the admin-configured SEO table
//  - the `canonicalSearch` query string (if any) that belongs on the
//    canonical <link> for that URL
//
// Used by both entry-server.jsx (to prefetch the right SEO row before
// rendering) and SEO.jsx (to render the tags) — previously each page
// component had to pass its own `page`/`canonicalSearch` props, which meant
// <SEO> was a *different* component instance per page and fully
// unmounted/remounted on every navigation. That cross-tree unmount/mount
// left React 19's native title/meta/link hoisting racing itself on
// client-side route changes (old page's tag lingering, or one render
// behind). Deriving everything from the URL lets <SEO> be a single,
// permanently-mounted component that just re-renders in place.

function slugify(text) {
  return text
    ?.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

const STATIC_PAGE_KEYS = {
  "/": "home",
  "/about": "about",
  "/blog": "blogs",
  "/most-selling-products": "most-selling-products",
  "/warranty-register": "warranty-register",
  "/categories": "categories",
  "/contact": "contact",
  "/brands": "brands",
  "/deals": "deals",
};

/**
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 * @returns {{ page: string|null, canonicalSearch: string }}
 *   page === null means this route renders no <SEO> (product/blog detail
 *   pages manage their own tags directly, and unmapped routes get no
 *   admin-configurable SEO data — still get a correct plain canonical).
 */
export function resolveSeoPageKey(pathname, searchParams) {
  if (pathname === "/shop") {
    const subCategoryParam = searchParams.get("subCategory");
    const categoryParam = searchParams.get("category");
    if (subCategoryParam) {
      return {
        page: `shop-category-${slugify(subCategoryParam)}`,
        canonicalSearch: `?subCategory=${encodeURIComponent(subCategoryParam)}`,
      };
    }
    if (categoryParam) {
      return {
        page: `shop-category-${slugify(categoryParam)}`,
        canonicalSearch: `?category=${encodeURIComponent(categoryParam)}`,
      };
    }
    return { page: "shop", canonicalSearch: "" };
  }

  const staticKey = STATIC_PAGE_KEYS[pathname];
  return { page: staticKey ?? null, canonicalSearch: "" };
}
