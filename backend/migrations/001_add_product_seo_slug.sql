-- Adds SEO-friendly slug + meta fields to products.
-- Run once: mysql -u root shop99 < migrations/001_add_product_seo_slug.sql
-- (slug is added without the UNIQUE constraint first because existing rows
-- have no slug yet — the backfill script fills them in, then the unique
-- index is added by 002 so we never violate it against NULLs mid-backfill.)

ALTER TABLE products
  ADD COLUMN slug VARCHAR(255) NULL AFTER name,
  ADD COLUMN meta_title VARCHAR(255) NULL,
  ADD COLUMN meta_description TEXT NULL;
