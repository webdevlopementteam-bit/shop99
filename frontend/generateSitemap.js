/**
 * generateSitemap.js
 *
 * Generates a sitemap.xml for the e-commerce site by pulling
 * static pages + dynamic categories/brands/products from the API,
 * and writes it into the frontend's public/ folder.
 *
 * USAGE:
 *   node generateSitemap.js
 *
 * Recommended: run this before every build, e.g. in package.json:
 *   "scripts": {
 *     "generate-sitemap": "node generateSitemap.js",
 *     "build": "node generateSitemap.js && vite build"
 *   }
 *
 * Requires Node 18+ (uses built-in fetch). If on older Node, install
 * node-fetch and uncomment the import below.
 */

// const fetch = require("node-fetch"); // uncomment if Node < 18 (also use: import fetch from "node-fetch";)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= CONFIG — EDIT THESE ================= */

// Your live site domain (no trailing slash)
const SITE_URL = "https://www.shop99.co.in";

// Your backend API base URL (no trailing slash)
// e.g. "https://api.shop99.co.in" or "https://shop99.co.in/api" root without /api
const API_BASE_URL = "https://api.shop99.co.in"; // <-- FILL THIS IN

// Where to write the sitemap (relative to this script's location)
// Point this at your Vite project's public/ folder
const OUTPUT_PATH = path.join(__dirname, "public", "sitemap.xml");

// How many products to fetch per page from /api/products (keep high to
// minimize requests — backend supports ?page=&limit=)
const PRODUCTS_PAGE_SIZE = 100;

/* ================= STATIC PAGES — EDIT AS NEEDED ================= */

const staticPages = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/shop", changefreq: "daily", priority: 0.9 },
  { url: "/about", changefreq: "monthly", priority: 0.5 },
  { url: "/contact", changefreq: "monthly", priority: 0.5 },
];

/* ================= URL BUILDERS — EDIT IF YOUR ROUTES DIFFER ================= */

// Assumption: product detail route is /product/:id (based on backend
// using findByPk(id), not a slug). Change this if your React Router
// route is e.g. /product/:slug or /product/:id/:slug
function buildProductUrl(product) {
  return `/product/${product.id}`;
}

// Category has a real `slug` field (backend generates it via slugify(name)),
// so use that for cleaner URLs. Change to category.id if your route uses id instead.
function buildCategoryUrl(category) {
  return `/category/${category.slug}`;
}

// Brand model has no slug field (only name/image), so id-based route.
function buildBrandUrl(brand) {
  return `/brand/${brand.id}`;
}

/* ================= FETCH HELPERS ================= */

async function safeFetchJson(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️  ${label} fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️  ${label} fetch error:`, err.message);
    return null;
  }
}

// Handles both { data: [...] } and plain [...] response shapes
function extractList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

async function fetchAllProducts() {
  const allProducts = [];
  let page = 1;
  let totalPages = 1;

  do {
    const json = await safeFetchJson(
      `${API_BASE_URL}/api/products?page=${page}&limit=${PRODUCTS_PAGE_SIZE}&include_offer=false`,
      `products page ${page}`
    );

    if (!json) break;

    const products = extractList(json);
    allProducts.push(...products);

    totalPages = json.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return allProducts;
}

async function fetchCategories() {
  // No ?page/&limit → backend returns { categories: [...], totalPages, currentPage }
  // and only publish=1 categories (frontend-safe, correct for sitemap).
  const json = await safeFetchJson(`${API_BASE_URL}/api/categories`, "categories");
  if (!json) return [];
  return Array.isArray(json.categories) ? json.categories : extractList(json);
}

async function fetchBrands() {
  const json = await safeFetchJson(`${API_BASE_URL}/api/brands`, "brands");
  return extractList(json);
}

/* ================= XML BUILDING ================= */

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, { changefreq = "weekly", priority = 0.7, lastmod } = {}) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

/* ================= MAIN ================= */

async function generateSitemap() {
  console.log("🔧 Generating sitemap...");

  const today = new Date().toISOString().split("T")[0];
  const entries = [];

  // Static pages
  staticPages.forEach((page) => {
    entries.push(
      urlEntry(`${SITE_URL}${page.url}`, {
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: today,
      })
    );
  });

  // Categories
  const categories = await fetchCategories();
  console.log(`📂 Categories fetched: ${categories.length}`);
  categories.forEach((cat) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildCategoryUrl(cat)}`, {
        changefreq: "weekly",
        priority: 0.7,
        lastmod: today,
      })
    );
  });

  // Brands
  const brands = await fetchBrands();
  console.log(`🏷️  Brands fetched: ${brands.length}`);
  brands.forEach((brand) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildBrandUrl(brand)}`, {
        changefreq: "weekly",
        priority: 0.6,
        lastmod: today,
      })
    );
  });

  // Products
  const products = await fetchAllProducts();
  console.log(`📦 Products fetched: ${products.length}`);
  products.forEach((product) => {
    entries.push(
      urlEntry(`${SITE_URL}${buildProductUrl(product)}`, {
        changefreq: "weekly",
        priority: 0.8,
        lastmod: today,
      })
    );
  });

  const xml = buildSitemapXml(entries);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, xml, "utf-8");

  console.log(`✅ Sitemap written to ${OUTPUT_PATH}`);
  console.log(`📊 Total URLs: ${entries.length}`);
}

generateSitemap().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});