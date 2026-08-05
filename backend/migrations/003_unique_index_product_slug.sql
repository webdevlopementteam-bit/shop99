-- Run AFTER 002_backfill_product_slugs.js has filled in every row's slug —
-- adding this earlier would fail while multiple rows still have NULL/blank slugs.
-- Run: mysql -u root shop99 < migrations/003_unique_index_product_slug.sql

ALTER TABLE products
  ADD UNIQUE INDEX idx_products_slug (slug);
