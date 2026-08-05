// controllers/productAttributeController.js

const ProductAttribute = require("../models/productAttributeModel");
const AttributeValue = require("../models/attributeValueModel");

/* GET BY PRODUCT */
exports.getByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const data = await ProductAttribute.findAll({
      where: { product_id: productId }
    });

    res.json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* UPDATE VALUE */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { attribute_value_id } = req.body;

    await ProductAttribute.update(
      { attribute_value_id },
      { where: { id } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.bulkAssign = async (req, res) => {
  try {
    const { product_id, attributes } = req.body;

    if (product_id == null || product_id === "") {
      return res.status(400).json({ message: "product_id required" });
    }

    const pid = Number(product_id);
    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ message: "Invalid product_id" });
    }

    await ProductAttribute.destroy({
      where: { product_id: pid }
    });

    const data = [];
    const seen = new Set();

    for (const a of attributes || []) {
      if (!a.attribute_id) continue;

      const attrId = Number(a.attribute_id);
      if (!Number.isFinite(attrId) || attrId <= 0) continue;

      // Legacy: comma-separated list of existing value IDs
      if (typeof a.attribute_value_id === "string") {
        const parts = a.attribute_value_id.split(",");
        for (const val of parts) {
          const trimmed = val.trim();
          if (!trimmed) continue;
          const num = Number(trimmed);
          if (!Number.isFinite(num) || num <= 0) continue;
          const key = `${attrId}-${num}`;
          if (seen.has(key)) continue;
          seen.add(key);
          data.push({
            product_id: pid,
            attribute_id: attrId,
            attribute_value_id: num
          });
        }
        continue;
      }

      const rawVid = a.attribute_value_id;
      let valueId =
        rawVid != null && rawVid !== "" ? Number(rawVid) : NaN;

      // Product form: temp id (<= 0) — persist text into attribute_values, then link
      if (!Number.isFinite(valueId) || valueId <= 0) {
        const text =
          a.value != null && String(a.value).trim() !== ""
            ? String(a.value).trim()
            : null;
        if (!text) continue;

        const [row] = await AttributeValue.findOrCreate({
          where: { attribute_id: attrId, value: text },
          defaults: { attribute_id: attrId, value: text }
        });
        valueId = row.id;
      }

      if (!Number.isFinite(valueId) || valueId <= 0) continue;

      const key = `${attrId}-${valueId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      data.push({
        product_id: pid,
        attribute_id: attrId,
        attribute_value_id: valueId
      });
    }

    if (data.length > 0) {
      await ProductAttribute.bulkCreate(data);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};