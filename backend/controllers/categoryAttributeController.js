// 

const CategoryAttributeMap = require("../models/categoryAttributeMapModel");
const Attribute = require("../models/attributeModel");
const Category = require("../models/categoryModel");

const Product = require("../models/productModel");
const ProductAttribute = require("../models/productAttributeModel");
const AttributeValue = require("../models/attributeValueModel");
const { Op } = require("sequelize");

function normalizePositiveIntIds(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const nums = arr
    .map((x) => parseInt(x, 10))
    .filter((x) => Number.isFinite(x) && x > 0);
  return [...new Set(nums)];
}

/** DB mein jo `attributes.id` maujood hain sirf unhi ko map karo — warna FK error 1452. */
async function filterExistingAttributeIds(ids) {
  if (!ids.length) return { valid: [], invalid: [] };
  const rows = await Attribute.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ["id"],
  });
  const ok = new Set(rows.map((r) => r.id));
  const valid = ids.filter((id) => ok.has(id));
  const invalid = ids.filter((id) => !ok.has(id));
  return { valid, invalid };
}

/* GET BY CATEGORY */
exports.getByCategory = async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findByPk(categoryId);

  let parentMapped = [];
  let extraMapped = [];

  // 🔥 if subcategory
  if (category.parent_id) {
    const parent = category.parent_id;

    // parent attributes
    const parentData = await CategoryAttributeMap.findAll({
      where: { category_id: parent }
    });

    parentMapped = parentData.map(x => x.attribute_id);

    // extra subcategory attributes
    const extraData = await CategoryAttributeMap.findAll({
      where: { category_id: categoryId, is_extra: true }
    });

    extraMapped = extraData.map(x => x.attribute_id);

  } else {
    // normal category
    const data = await CategoryAttributeMap.findAll({
      where: { category_id: categoryId }
    });

    parentMapped = data.map(x => x.attribute_id);
  }

  const allAttributes = await Attribute.findAll();

  res.json({
    all: allAttributes,
    mapped: parentMapped,   // 🔥 IMPORTANT FIX
    parentMapped,
    extraMapped
  });
};

// Assign attributes to category

exports.assign = async (req, res) => {
  try {
    const { category_id, attribute_ids, apply_to_sub, extra_ids } = req.body;

    const mainIds = normalizePositiveIntIds(attribute_ids);
    const extraIdList = normalizePositiveIntIds(extra_ids);

    const { valid: validMain, invalid: invalidMain } =
      await filterExistingAttributeIds(mainIds);
    const { valid: validExtra, invalid: invalidExtra } =
      await filterExistingAttributeIds(extraIdList);

    if (mainIds.length > 0 && validMain.length === 0) {
      return res.status(400).json({
        message:
          "None of the selected attributes exist in the database. Refresh the attributes list or remove deleted attributes.",
        invalid_attribute_ids: [...new Set([...invalidMain, ...invalidExtra])],
      });
    }

    const skipped_invalid_attribute_ids = [
      ...new Set([...invalidMain, ...invalidExtra]),
    ];

    /* ================= CATEGORY MAPPING ================= */

    await CategoryAttributeMap.destroy({ where: { category_id } });

    const data = validMain.map((attr_id) => ({
      category_id,
      attribute_id: attr_id,
      is_extra: false,
    }));

    if (data.length > 0) {
      await CategoryAttributeMap.bulkCreate(data);
    }

    /* ================= APPLY TO SUBCATEGORY ================= */

    if (apply_to_sub) {
      const subs = await Category.findAll({
        where: { parent_id: category_id },
      });

      for (let sub of subs) {
        await CategoryAttributeMap.destroy({
          where: { category_id: sub.id },
        });

        const subData = validMain.map((attr_id) => ({
          category_id: sub.id,
          attribute_id: attr_id,
          is_extra: false,
        }));

        if (subData.length > 0) {
          await CategoryAttributeMap.bulkCreate(subData);
        }
      }
    }

    /* ================= EXTRA SUBCATEGORY ATTRIBUTES ================= */

    if (validExtra.length > 0) {
      const extraData = validExtra.map((attr_id) => ({
        category_id,
        attribute_id: attr_id,
        is_extra: true,
      }));

      await CategoryAttributeMap.bulkCreate(extraData);
    }

    /* ===================================================== */
    /* 🔥 AUTO ASSIGN ATTRIBUTES TO PRODUCTS (FIXED) 🔥 */
    /* ===================================================== */

    // ✅ STEP 1: Get default values for all attributes (OPTIMIZED)
    const values = await AttributeValue.findAll({
      where: { attribute_id: validMain },
    });

    const valueMap = {};
    values.forEach(v => {
      if (!valueMap[v.attribute_id]) {
        valueMap[v.attribute_id] = v.id; // first value
      }
    });

    // 🔹 Parent category products
    const products = await Product.findAll({
      where: { category_id }
    });

    for (let product of products) {
      for (let attr_id of validMain) {

        const exists = await ProductAttribute.findOne({
          where: {
            product_id: product.id,
            attribute_id: attr_id
          }
        });

        if (!exists) {

          if (!valueMap[attr_id]) {
            console.warn("No value found for attribute:", attr_id);
            continue;
          }

          // await ProductAttribute.create({
          //   product_id: product.id,
          //   attribute_id: attr_id,
          //   attribute_value_id: valueMap[attr_id]
          // });
        }
      }
    }

    /* ================= SUBCATEGORY PRODUCTS ================= */

    if (apply_to_sub) {
      const subs = await Category.findAll({
        where: { parent_id: category_id }
      });

      for (let sub of subs) {

        const subProducts = await Product.findAll({
          where: { category_id: sub.id }
        });

        for (let product of subProducts) {
          for (let attr_id of validMain) {

            const exists = await ProductAttribute.findOne({
              where: {
                product_id: product.id,
                attribute_id: attr_id
              }
            });

            if (!exists) {

              if (!valueMap[attr_id]) {
                console.warn("No value found for attribute:", attr_id);
                continue;
              }

              // await ProductAttribute.create({
              //   product_id: product.id,
              //   attribute_id: attr_id,
              //   attribute_value_id: valueMap[attr_id]
              // });
            }

          }
        }
      }
    }

    res.json({
      success: true,
      ...(skipped_invalid_attribute_ids.length > 0 && {
        skipped_invalid_attribute_ids,
      }),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get full attributes with values for a category

exports.getFullAttributes = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const mappings = await CategoryAttributeMap.findAll({
      where: { category_id: categoryId }
    });

    const attributeIds = mappings.map(m => m.attribute_id);

    const attributes = await Attribute.findAll({
      where: { id: attributeIds },
      include: [
        {
          model: AttributeValue,
          attributes: ["id", "value"]
        }
      ]
    });

    res.json(attributes);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};