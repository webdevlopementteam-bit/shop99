import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PreloadedProductProvider } from "./context/PreloadedProductContext.jsx";
import { PreloadedSeoProvider } from "./context/PreloadedSeoContext.jsx";
import { PreloadedBlogProvider } from "./context/PreloadedBlogContext.jsx";
import { getProductByIdApi, getSEOByPageApi, getBlogByIdApi } from "./api/api.js";

// ToastContainer is intentionally excluded here — it's a client-only overlay
// (portals to document.body) and has nothing meaningful to render on first paint.

// React 19 natively hoists <title>/<meta>/<link> rendered anywhere in the tree
// (that's what powers <Helmet>'s tags too). renderToString has no real <head>
// to hoist into, so it emits them as a plain prefix on the output string —
// split that prefix off so it lands in the template's real <head> instead of
// inside #root.
const HOISTED_HEAD_TAG = /^\s*(<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>)/;

function splitHoistedHead(rawHtml) {
  let head = "";
  let html = rawHtml;
  let match;
  while ((match = html.match(HOISTED_HEAD_TAG))) {
    head += match[1];
    html = html.slice(match[0].length);
  }
  return { head, html };
}

const PRODUCT_PAGE_URL_RE = /^\/productPage\/([^/?#]+)/;

/**
 * ProductPage.jsx normally fetches its product in a useEffect (client-only,
 * like every other data fetch in this app) — fine for the rest of the app's
 * "shell SSR", but the whole point of the product page's SSR is to get the
 * real per-product <title>/<meta description> into the HTML a crawler sees,
 * which needs the product fetched *before* we render this one route.
 */
async function preloadProductForUrl(url) {
  const match = url.match(PRODUCT_PAGE_URL_RE);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  try {
    return await getProductByIdApi(slug);
  } catch {
    return null; // Falls back to the client fetching it post-hydration, same as a failed client fetch would.
  }
}

/**
 * Mirrors each page's own `<SEO page="...">` key so the *server* can fetch
 * the same row before rendering — same reasoning as preloadProductForUrl:
 * <SEO> normally fetches in a useEffect (client-only), so without this the
 * SSR HTML (and hydration's first paint) would always show the "Default
 * Title"/"Default description" fallback instead of the admin-saved values,
 * and the fallback tags would end up stuck alongside the real ones once the
 * client fetch resolves (a hydration mismatch <Helmet> can't cleanly patch).
 */
function resolveSeoPageKeyForUrl(url) {
  const { pathname, searchParams } = new URL(url, "http://internal");

  if (pathname === "/") return "home";
  if (pathname === "/about") return "about";
  if (pathname === "/blog") return "blogs";
  if (pathname === "/most-selling-products") return "most-selling-products";
  if (pathname === "/warranty-register") return "warranty-register";

  if (pathname === "/shop") {
    const slugify = (text) =>
      text
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "");
    const subCategoryParam = searchParams.get("subCategory");
    const categoryParam = searchParams.get("category");
    if (subCategoryParam) return `shop-category-${slugify(subCategoryParam)}`;
    if (categoryParam) return `shop-category-${slugify(categoryParam)}`;
    return "shop";
  }

  return null; // Page renders no <SEO> (or isn't one of the above) — nothing to preload.
}

const BLOG_DETAIL_URL_RE = /^\/blog\/([^/?#]+)/;

/**
 * BlogDetail.jsx normally fetches its post in a useEffect (client-only) —
 * same gap as ProductPage without this: the SSR HTML (and hydration's first
 * paint) would ship a loading/empty state with the "Default"-ish <Helmet>
 * tags instead of the post's real title/description, and once the client
 * fetch resolved the real tags would end up duplicated alongside them.
 */
async function preloadBlogForUrl(url) {
  const match = url.match(BLOG_DETAIL_URL_RE);
  if (!match) return null;
  const idOrSlug = decodeURIComponent(match[1]);
  try {
    return await getBlogByIdApi(idOrSlug);
  } catch {
    return null; // Falls back to the client fetching it post-hydration, same as a failed client fetch would.
  }
}

async function preloadSeoForUrl(url) {
  const page = resolveSeoPageKeyForUrl(url);
  if (!page) return null;

  try {
    let data = await getSEOByPageApi(page);
    // Same shop-category → shop fallback SEO.jsx applies client-side.
    if (data == null && page !== "shop" && page.startsWith("shop-category-")) {
      data = await getSEOByPageApi("shop");
    }
    return { page, data };
  } catch {
    return null; // Falls back to the client fetching it post-hydration, same as a failed client fetch would.
  }
}

export async function render(url) {
  const helmetContext = {};
  const [preloadedProduct, preloadedSeo, preloadedBlog] = await Promise.all([
    preloadProductForUrl(url),
    preloadSeoForUrl(url),
    preloadBlogForUrl(url),
  ]);

  const rawHtml = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AuthProvider>
            <CartProvider>
              <PreloadedProductProvider value={preloadedProduct}>
                <PreloadedSeoProvider value={preloadedSeo}>
                  <PreloadedBlogProvider value={preloadedBlog}>
                    <App />
                  </PreloadedBlogProvider>
                </PreloadedSeoProvider>
              </PreloadedProductProvider>
            </CartProvider>
          </AuthProvider>
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>
  );

  const { head, html } = splitHoistedHead(rawHtml);
  return { html, head, preloadedProduct, preloadedSeo, preloadedBlog };
}
