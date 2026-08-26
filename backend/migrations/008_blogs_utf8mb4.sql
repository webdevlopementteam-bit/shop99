-- The `blogs` table (and the columns added by 004) inherited the table's
-- original latin1_swedish_ci charset instead of the utf8mb4 the Sequelize
-- model declares. latin1 can't store ₹, em/en dashes, curly quotes, emoji,
-- etc. — any of those in blog content/title/meta fields crashed the insert
-- with an uncaught SequelizeDatabaseError (500 to the client).
-- Run: mysql -u <user> -p'<password>' <db> < migrations/008_blogs_utf8mb4.sql

ALTER TABLE blogs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
