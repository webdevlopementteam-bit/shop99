import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PreloadedProductProvider } from "./context/PreloadedProductContext.jsx";
import { PreloadedSeoProvider } from "./context/PreloadedSeoContext.jsx";
import { PreloadedBlogProvider } from "./context/PreloadedBlogContext.jsx";
import { getProductByIdApi, getSEOByPageApi, getBlogByIdApi } from "./api/api.js";
import { resolveSeoPageKey } from "./utils/seoPageKey.js";

// ToastContainer is intentionally excluded here — it's a client-only overlay
// (portals to document.body) and has nothing meaningful to render on first paint.

// React 19 natively hoists <title>/<meta>/<link> rendered anywhere in the
// tree (SEO.jsx, ProductPage.jsx, BlogDetail.jsx all rely on this directly —
// no react-helmet-async involved). renderToString has no real <head> to
// hoist into, so it emits them as a plain prefix on the output string —
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

const BLOG_DETAIL_URL_RE = /^\/blog\/([^/?#]+)/;

/**
 * BlogDetail.jsx normally fetches its post in a useEffect (client-only) —
 * same gap as ProductPage without this: the SSR HTML (and hydration's first
 * paint) would ship a loading/empty state with generic tags instead of the
 * post's real title/description.
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
  const { pathname, searchParams } = new URL(url, "http://internal");
  const { page } = resolveSeoPageKey(pathname, searchParams);
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
  const [preloadedProduct, preloadedSeo, preloadedBlog] = await Promise.all([
    preloadProductForUrl(url),
    preloadSeoForUrl(url),
    preloadBlogForUrl(url),
  ]);

  const rawHtml = renderToString(
    <StrictMode>
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
    </StrictMode>
  );

  const { head, html } = splitHoistedHead(rawHtml);
  return { html, head, preloadedProduct, preloadedSeo, preloadedBlog };
}
