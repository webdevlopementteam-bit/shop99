-- Adds a purchase_source toggle to warranty registrations ("shop99" vs
-- "other" — bought from a different retailer) and makes order_pk nullable
-- since an "other" registration has no Shop99 order to reference.
-- Run: mysql -h 127.0.0.1 -P 3306 -u <user> -p'<password>' <db> < migrations/009_warranty_purchase_source.sql

ALTER TABLE warranty_registrations
  ADD COLUMN purchase_source ENUM('shop99','other') NOT NULL DEFAULT 'shop99' AFTER user_id,
  MODIFY COLUMN order_pk INT NULL;
