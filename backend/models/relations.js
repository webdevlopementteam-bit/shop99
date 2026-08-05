
const Product = require("./productModel");
const Category = require("./categoryModel");
const Brand = require("./brandModel");
const User = require("./userModel");
const Admin = require("./adminModel");
const Wishlist = require("./Wishlist");
const CouponUsage = require("./couponUsageModel");
const ProductImage = require("./productImageModel");

// 🔥 ADD THESE IMPORTS
const ProductAttribute = require("./productAttributeModel");
const Attribute = require("./attributeModel");
const AttributeValue = require("./attributeValueModel");

const Offer = require("./offerModel");
const Banner = require("./bannerModel");


const OfferUsage = require("./offerUsageModel");
const Coupon = require("./couponModel");

const CategoryAttributeMap = require("./categoryAttributeMapModel");

const ProductVariant = require("./productVariantModel");
const ProductVariantImage = require("./productVariantImageModel");
const ProductShippingRate = require("./productShippingRateModel");
const ProductReview = require("./productReviewModel");
const UserAddress = require("./userAddressModel");

/* ================= PRODUCT RELATIONS ================= */

Product.belongsTo(Category, { foreignKey: "category_id" });
Product.belongsTo(Brand, { foreignKey: "brand_id" });

// 🔥 ADD THIS
Product.hasMany(ProductAttribute, {
  foreignKey: "product_id"
});


// Product → multiple images
Product.hasMany(ProductImage, {
  foreignKey: "product_id",
  as: "images"
});

ProductImage.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductVariant, {
  foreignKey: "product_id",
  as: "variants"
});

ProductVariant.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductShippingRate, {
  foreignKey: "product_id",
  as: "shippingRates"
});

ProductShippingRate.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductReview, {
  foreignKey: "product_id",
  as: "reviews"
});

ProductReview.belongsTo(Product, {
  foreignKey: "product_id"
});

User.hasMany(ProductReview, {
  foreignKey: "user_id"
});

ProductReview.belongsTo(User, {
  foreignKey: "user_id"
});

User.hasMany(UserAddress, {
  foreignKey: "user_id",
  as: "addresses"
});

UserAddress.belongsTo(User, {
  foreignKey: "user_id"
});

ProductVariant.hasMany(ProductVariantImage, {
  foreignKey: "variant_id",
  as: "images"
});

/* ================= CATEGORY SELF RELATION ================= */

Category.belongsTo(Category, {
  as: "parent",
  foreignKey: "parent_id"
});

Category.hasMany(Category, {
  as: "children",
  foreignKey: "parent_id"
});


/* ================= PRODUCT ATTRIBUTE RELATIONS ================= */

// 🔥 ADD ALL THESE
ProductAttribute.belongsTo(Product, {
  foreignKey: "product_id"
});

ProductAttribute.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});

ProductAttribute.belongsTo(AttributeValue, {
  foreignKey: "attribute_value_id"
});


/* ================= ATTRIBUTE RELATIONS ================= */

// optional but best practice
Attribute.hasMany(AttributeValue, {
  foreignKey: "attribute_id"
});

AttributeValue.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});


/* ================= WISHLIST RELATIONS ================= */

// Many-to-Many User <-> Product
User.belongsToMany(Product, { through: Wishlist });
Product.belongsToMany(User, { through: Wishlist });

// 🔥 IMPORTANT FOR EAGER LOADING
Wishlist.belongsTo(User, { foreignKey: "UserId" });
Wishlist.belongsTo(Product, { foreignKey: "ProductId" });


/* ================= OFFER RELATIONS ================= */
Offer.belongsTo(Product, { foreignKey: "product_id" });

// coupen 

Coupon.hasMany(CouponUsage, { foreignKey: "coupon_id" });
CouponUsage.belongsTo(Coupon, { foreignKey: "coupon_id" });

User.hasMany(CouponUsage, { foreignKey: "user_id" });
CouponUsage.belongsTo(User, { foreignKey: "user_id" });



// Banner → Product
Banner.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product"
});

// Product → Banner
Product.hasMany(Banner, {
  foreignKey: "product_id",
  as: "banners"
});

/* ================= OFFER RELATIONS ================= */

// Offer → Product
Offer.belongsTo(Product, { foreignKey: "product_id" });

// 🔥 NEW (IMPORTANT)
Offer.hasMany(OfferUsage, {
  foreignKey: "offer_id",
  as: "usages"
});

OfferUsage.belongsTo(Offer, {
  foreignKey: "offer_id"
});

// 🔥 OPTIONAL (recommended)
User.hasMany(OfferUsage, {
  foreignKey: "user_id"
});

OfferUsage.belongsTo(User, {
  foreignKey: "user_id"
});



CategoryAttributeMap.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});


module.exports = {
  Product,
  Category,
  Brand,
  User,
  Admin,
  Wishlist,
  ProductAttribute,
  Attribute,
  AttributeValue,
  Offer,
  Banner,
  Coupon,
  CategoryAttributeMap,
  ProductImage,
  ProductVariant,
  ProductVariantImage,
  ProductShippingRate,
  ProductReview,
  UserAddress
};