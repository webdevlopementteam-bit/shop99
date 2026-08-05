import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PreloadedProductProvider } from "./context/PreloadedProductContext.jsx";
import { getProductByIdApi } from "./api/api.js";

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

export async function render(url) {
  const helmetContext = {};
  const preloadedProduct = await preloadProductForUrl(url);

  const rawHtml = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AuthProvider>
            <CartProvider>
              <PreloadedProductProvider value={preloadedProduct}>
                <App />
              </PreloadedProductProvider>
            </CartProvider>
          </AuthProvider>
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>
  );

  const { head, html } = splitHoistedHead(rawHtml);
  return { html, head, preloadedProduct };
}
