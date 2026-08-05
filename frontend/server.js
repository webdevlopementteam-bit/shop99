import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.SSR_PORT || 5174;
const base = process.env.BASE || "/";
const entryServerPath = path.resolve(__dirname, "dist/server/entry-server.js");

const templateHtml = isProduction
  ? await fs.readFile(path.resolve(__dirname, "dist/client/index.html"), "utf-8")
  : "";

// Vite serves .css URLs as JS modules by default (it needs that for HMR);
// appending `?direct` is Vite's documented escape hatch for getting the
// actual compiled text/css response, which is what a <link> tag needs.
const DEV_STYLE_LINKS = [
  "/src/index.css",
  "/node_modules/react-toastify/dist/ReactToastify.css",
  "/node_modules/slick-carousel/slick/slick.css",
  "/node_modules/slick-carousel/slick/slick-theme.css",
]
  .map((href) => `<link rel="stylesheet" href="${href}?direct">`)
  .join("\n    ");

const app = express();

let vite;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
  });
  app.use(vite.middlewares);
} else {
  const compression = (await import("compression")).default;
  const sirv = (await import("sirv")).default;
  app.use(compression());
  app.use(
    base,
    sirv(path.resolve(__dirname, "dist/client"), { extensions: [] })
  );
}

// The SSR HTML always comes from the Rollup-bundled dist/server build (built
// via `npm run build:server`) — in dev too. Vite's live SSR module runner
// (vite.ssrLoadModule) doesn't interop cleanly with several of this app's
// CJS-only UI deps (react-slick, fontawesome...); Rollup's bundler handles
// them correctly. Client code still gets full Vite dev middleware + HMR —
// re-run `npm run build:server` (or restart `npm run dev`) to pick up
// changes to server-rendered code.
let cachedRender;
async function loadRenderer() {
  if (!cachedRender) {
    cachedRender = (await import(pathToFileURL(entryServerPath).href)).render;
  }
  return cachedRender;
}

app.use("*all", async (req, res) => {
  const url = req.originalUrl.replace(base, "/");

  let template = templateHtml;
  if (!isProduction) {
    template = await fs.readFile(path.resolve(__dirname, "index.html"), "utf-8");
    template = await vite.transformIndexHtml(url, template);
    // Vite's dev server injects CSS via JS (for HMR) instead of a <link>
    // tag, so with SSR the fully-rendered markup would otherwise paint
    // unstyled before that JS runs — a flash of unstyled content on every
    // load/refresh. Linking the global stylesheets directly lets the browser
    // apply them before first paint; production builds already emit a real
    // <link rel="stylesheet"> so this is dev-only.
    template = template.replace(
      "<!--app-head-->",
      `${DEV_STYLE_LINKS}\n    <!--app-head-->`
    );
  }

  // If SSR rendering fails for any reason, fall back to shipping the client
  // bundle with an empty #root — the browser then renders the page entirely
  // client-side (the same behavior the app had before SSR existed) instead
  // of a hard 500.
  let appHtml = "";
  let appHead = "";
  let preloadedProduct = null;
  try {
    const render = await loadRenderer();
    ({ html: appHtml, head: appHead, preloadedProduct } = await render(url));
  } catch (e) {
    console.error("SSR render failed, falling back to client-only render:", e.stack);
  }

  // Only ~6 of 21 pages render <SEO> (which is what supplies <title> via
  // React 19's tag hoisting); the rest (and the SSR-failure fallback above)
  // need a default so <head> never ends up without one.
  const headWithFallback = /<title[\s>]/.test(appHead)
    ? appHead
    : `<title>SHOP99</title>${appHead}`;

  // Embed what entry-server.jsx fetched so entry-client.jsx's hydration
  // reuses it instead of re-fetching (and so hydration's first render
  // matches what was actually sent).
  const preloadedDataScript = preloadedProduct
    ? `<script>window.__PRELOADED_PRODUCT__=${JSON.stringify(preloadedProduct).replace(/</g, "\\u003c")}</script>`
    : "";

  const html = template
    .replace("<!--app-head-->", headWithFallback)
    .replace("<!--app-html-->", appHtml + preloadedDataScript);

  res.status(200).set({ "Content-Type": "text/html" }).send(html);
});

app.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
