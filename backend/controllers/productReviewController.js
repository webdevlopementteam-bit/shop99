const sequelize = require("../config/db");
const ProductReview = require("../models/productReviewModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");

const MAX_REVIEW_IMAGES = 10;

const orderByReviewDate = [
  [
    sequelize.fn(
      "COALESCE",
      sequelize.col("ProductReview.reviewed_at"),
      sequelize.col("ProductReview.createdAt")
    ),
    "DESC"
  ]
];

/** ISO / parseable date; no future dates (2m skew). Null = caller may use new Date(). */
const parseReviewedAt = (body) => {
  const raw = body?.reviewedAt ?? body?.review_date ?? body?.reviewed_at;
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now() + 120000) return null;
  return d;
};

const parseImagesFromBody = (body) => {
  const raw = body?.images ?? body?.imageUrls;
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      return Array.isArray(p) ? p.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  return [];
};

/** Multer `upload.fields([{ name: "images" }])` → `req.files.images` */
function listReviewUploads(req) {
  const arr = req.files?.images;
  return Array.isArray(arr) ? arr : [];
}

function resolveImagesForCreate(req) {
  if (String(req.body?.clearImages) === "true" || req.body?.clearImages === "1") {
    return null;
  }
  const uploaded = listReviewUploads(req).map((f) => `/uploads/${f.filename}`);
  const fromBody = parseImagesFromBody(req.body);
  const merged = [...fromBody, ...uploaded].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const u of merged) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_REVIEW_IMAGES) break;
  }
  return out.length ? out : null;
}

function resolveImagesForUpdate(req, review) {
  const clear = String(req.body?.clearImages) === "true" || req.body?.clearImages === "1";
  if (clear) return null;

  const uploadedList = listReviewUploads(req);
  const hasNewInput =
    uploadedList.length > 0 ||
    req.body?.images !== undefined ||
    req.body?.imageUrls !== undefined;

  if (!hasNewInput) return undefined;

  const uploaded = uploadedList.map((f) => `/uploads/${f.filename}`);
  const fromBody = parseImagesFromBody(req.body);
  const merged = [...fromBody, ...uploaded].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const u of merged) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_REVIEW_IMAGES) break;
  }
  return out.length ? out : null;
}

const parseRating = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
};

exports.createReview = async (req, res) => {
  try {
    const productIdRaw = req.body.productId ?? req.body.product_id;
    const productId = Number(productIdRaw);
    const { rating, comment, reviewerName, name } = req.body;
    const r = parseRating(rating);
    const manualName = (reviewerName ?? name)?.toString?.().trim() || "";

    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ message: "productId is required" });
    }
    if (r === null) {
      return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const reviewedAt = parseReviewedAt(req.body) || new Date();
    const imagesVal = resolveImagesForCreate(req);

    const loggedIn = req.user && req.user.id != null;

    if (loggedIn) {
      const userId = req.user.id;
      const dbUser = await User.findByPk(userId, { attributes: ["id", "name"] });
      const displayName = manualName || dbUser?.name || "User";

      const [review, created] = await ProductReview.findOrCreate({
        where: { user_id: userId, product_id: productId },
        defaults: {
          rating: r,
          comment: comment ?? null,
          reviewer_name: displayName,
          reviewed_at: reviewedAt,
          images: imagesVal
        }
      });

      if (!created) {
        return res.status(409).json({
          message: "You already reviewed this product. Use update to change it."
        });
      }

      const full = await ProductReview.findByPk(review.id, {
        include: [
          { model: User, attributes: ["id", "name"] },
          { model: Product, attributes: ["id", "name"] }
        ]
      });

      return res.status(201).json(full);
    }

    if (!manualName) {
      return res.status(400).json({
        message: "reviewerName (or name) is required when not logged in"
      });
    }

    const review = await ProductReview.create({
      product_id: productId,
      user_id: null,
      rating: r,
      comment: comment ?? null,
      reviewer_name: manualName,
      reviewed_at: reviewedAt,
      images: imagesVal
    });

    const full = await ProductReview.findByPk(review.id, {
      include: [{ model: Product, attributes: ["id", "name"] }]
    });

    res.status(201).json(full);
  } catch (error) {
    console.error("createReview:", error);
    res.status(500).json({ message: error.message || "Error creating review" });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.user_id !== userId) {
      return res.status(403).json({ message: "Not allowed to edit this review" });
    }

    if (rating !== undefined) {
      const r = parseRating(rating);
      if (r === null) {
        return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
      }
      review.rating = r;
    }
    if (comment !== undefined) {
      review.comment = comment;
    }
    const { reviewerName, name } = req.body;
    const manualName = (reviewerName ?? name)?.toString?.().trim();
    if (manualName) {
      review.reviewer_name = manualName;
    }

    const nextReviewed = parseReviewedAt(req.body);
    if (nextReviewed != null) {
      review.reviewed_at = nextReviewed;
    }

    const nextImages = resolveImagesForUpdate(req, review);
    if (nextImages !== undefined) {
      review.images = nextImages;
    }

    await review.save();

    const full = await ProductReview.findByPk(review.id, {
      include: [
        { model: User, attributes: ["id", "name"] },
        { model: Product, attributes: ["id", "name"] }
      ]
    });

    res.json(full);
  } catch (error) {
    console.error("updateReview:", error);
    res.status(500).json({ message: error.message || "Error updating review" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review.user_id !== userId) {
      return res.status(403).json({ message: "Not allowed to delete this review" });
    }

    await review.destroy();
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("deleteReview:", error);
    res.status(500).json({ message: error.message || "Error deleting review" });
  }
};

exports.getReviewsByProduct = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      where: { product_id: productId },
      include: [{ model: User, attributes: ["id", "name"] }],
      order: orderByReviewDate,
      limit,
      offset
    });

    const totalReviews = await ProductReview.count({ where: { product_id: productId } });
    const sumRating = await ProductReview.sum("rating", { where: { product_id: productId } });
    const averageRating =
      totalReviews && sumRating != null
        ? Number((Number(sumRating) / totalReviews).toFixed(2))
        : 0;

    res.json({
      summary: {
        averageRating,
        totalReviews
      },
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 0,
      reviews: rows
    });
  } catch (error) {
    console.error("getReviewsByProduct:", error);
    res.status(500).json({ message: error.message || "Error fetching reviews" });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await ProductReview.findAll({
      where: { user_id: userId },
      include: [{ model: Product, attributes: ["id", "name", "image", "price"] }],
      order: orderByReviewDate
    });

    res.json(reviews);
  } catch (error) {
    console.error("getMyReviews:", error);
    res.status(500).json({ message: error.message || "Error fetching reviews" });
  }
};

/* ================= ADMIN (Bearer admin JWT) ================= */

const reviewIncludeAdmin = [
  { model: User, attributes: ["id", "name", "phone"] },
  { model: Product, attributes: ["id", "name"] }
];

exports.adminListReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const { rows, count } = await ProductReview.findAndCountAll({
      include: reviewIncludeAdmin,
      order: orderByReviewDate,
      limit,
      offset
    });

    res.json({
      reviews: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 0
    });
  } catch (error) {
    console.error("adminListReviews:", error);
    res.status(500).json({ message: error.message || "Error fetching reviews" });
  }
};

exports.adminCreateReview = async (req, res) => {
  try {
    const productIdRaw = req.body.productId ?? req.body.product_id;
    const productId = Number(productIdRaw);
    const userIdRaw = req.body.userId ?? req.body.user_id;
    const userId =
      userIdRaw != null && userIdRaw !== ""
        ? Number(userIdRaw)
        : null;
    const { rating, comment, reviewerName, name } = req.body;
    const r = parseRating(rating);
    const manualName = (reviewerName ?? name)?.toString?.().trim() || "";

    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ message: "productId or product_id is required" });
    }
    if (r === null) {
      return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
    }

    const reviewedAt = parseReviewedAt(req.body) || new Date();
    const imagesVal = resolveImagesForCreate(req);

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (userId != null) {
      if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ message: "Invalid user_id" });
      }
      const dbUser = await User.findByPk(userId, { attributes: ["id", "name"] });
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const displayName = manualName || dbUser.name || "User";

      const [review, created] = await ProductReview.findOrCreate({
        where: { user_id: userId, product_id: productId },
        defaults: {
          rating: r,
          comment: comment ?? null,
          reviewer_name: displayName,
          reviewed_at: reviewedAt,
          images: imagesVal
        }
      });

      if (!created) {
        return res.status(409).json({
          message: "This user already has a review for this product."
        });
      }

      const full = await ProductReview.findByPk(review.id, {
        include: reviewIncludeAdmin
      });
      return res.status(201).json(full);
    }

    if (!manualName) {
      return res.status(400).json({
        message: "reviewerName (or name) is required when user_id is not set"
      });
    }

    const review = await ProductReview.create({
      product_id: productId,
      user_id: null,
      rating: r,
      comment: comment ?? null,
      reviewer_name: manualName,
      reviewed_at: reviewedAt,
      images: imagesVal
    });

    const full = await ProductReview.findByPk(review.id, {
      include: [{ model: Product, attributes: ["id", "name"] }]
    });

    res.status(201).json(full);
  } catch (error) {
    console.error("adminCreateReview:", error);
    res.status(500).json({ message: error.message || "Error creating review" });
  }
};

exports.adminUpdateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, reviewerName, name } = req.body;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating !== undefined) {
      const r = parseRating(rating);
      if (r === null) {
        return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
      }
      review.rating = r;
    }
    if (comment !== undefined) {
      review.comment = comment;
    }
    const manualName = (reviewerName ?? name)?.toString?.().trim();
    if (manualName) {
      review.reviewer_name = manualName;
    }

    const nextReviewed = parseReviewedAt(req.body);
    if (nextReviewed != null) {
      review.reviewed_at = nextReviewed;
    }

    const nextImages = resolveImagesForUpdate(req, review);
    if (nextImages !== undefined) {
      review.images = nextImages;
    }

    await review.save();

    const full = await ProductReview.findByPk(review.id, {
      include: reviewIncludeAdmin
    });

    res.json(full);
  } catch (error) {
    console.error("adminUpdateReview:", error);
    res.status(500).json({ message: error.message || "Error updating review" });
  }
};

exports.adminDeleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    await review.destroy();
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("adminDeleteReview:", error);
    res.status(500).json({ message: error.message || "Error deleting review" });
  }
};
