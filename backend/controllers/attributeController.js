// controllers/attributeController


const Attribute = require("../models/attributeModel");
const AttributeValue = require("../models/attributeValueModel");

/* CREATE */
exports.create = async (req, res) => {
  try {
    const { name, is_published, variants } = req.body;

    const attribute = await Attribute.create({
      name,
      is_published: is_published ?? false
    });

    if (variants && variants.length) {
      const values = variants.map(v => ({
        value: v,
        attribute_id: attribute.id
      }));

      await AttributeValue.bulkCreate(values);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* GET ALL */
exports.getAll = async (req, res) => {
  try {
    const data = await Attribute.findAll({
      include: [
        {
          model: AttributeValue,
          attributes: ["id", "value"]
        }
      ]
    });

    res.json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* UPDATE */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_published, variants } = req.body;

    await Attribute.update(
      { name, is_published },
      { where: { id } }
    );

    if (variants) {
      await AttributeValue.destroy({
        where: { attribute_id: id }
      });

      const values = variants.map(v => ({
        value: v,
        attribute_id: id
      }));

      await AttributeValue.bulkCreate(values);
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* DELETE */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 delete variants first
    await AttributeValue.destroy({
      where: { attribute_id: id }
    });

    // then delete attribute
    await Attribute.destroy({
      where: { id }
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};