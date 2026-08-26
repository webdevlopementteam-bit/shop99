-- Removes the old structured blog fields now that content is a single
-- rich-text field. Run AFTER 005_backfill_blog_slugs.js has copied their
-- data into `content` for every existing row — this migration is destructive.
-- Run: mysql -u root shop99 < migrations/007_drop_legacy_blog_fields.sql

ALTER TABLE blogs
  DROP COLUMN question,
  DROP COLUMN answer,
  DROP COLUMN features,
  DROP COLUMN benefits,
  DROP COLUMN why_choose_us,
  DROP COLUMN conclusion,
  DROP COLUMN faq;
