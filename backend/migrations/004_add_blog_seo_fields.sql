-- Adds rich-text content + SEO fields (slug, meta title/description/keywords) to blogs.
-- Run once: mysql -u root shop99 < migrations/004_add_blog_seo_fields.sql
-- (slug is added without the UNIQUE constraint first because existing rows
-- have no slug yet — 005 backfills them, then 006 adds the unique index so
-- we never violate it against NULLs mid-backfill, same pattern as products.)

ALTER TABLE blogs
  ADD COLUMN slug VARCHAR(255) NULL AFTER title,
  ADD COLUMN content LONGTEXT NULL,
  ADD COLUMN meta_title VARCHAR(255) NULL,
  ADD COLUMN meta_description TEXT NULL,
  ADD COLUMN meta_keywords VARCHAR(500) NULL;
