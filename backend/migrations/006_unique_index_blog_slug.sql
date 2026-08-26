-- Run AFTER 005_backfill_blog_slugs.js has filled in every row's slug —
-- adding this earlier would fail while multiple rows still have NULL/blank slugs.
-- Run: mysql -u root shop99 < migrations/006_unique_index_blog_slug.sql

ALTER TABLE blogs
  ADD UNIQUE INDEX idx_blogs_slug (slug);
