const fs = require("fs");
const path = require("path");
const About = require("../models/aboutModel");

const parseJsonField = (value, fallback = []) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const removeUploadedFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, "../uploads", filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const getUploadedFile = (files, fieldName) => {
  if (!files || !Array.isArray(files[fieldName]) || !files[fieldName].length) {
    return null;
  }
  return files[fieldName][0];
};

const cleanupUploadedFiles = (files = {}) => {
  Object.values(files).forEach((fileList) => {
    if (!Array.isArray(fileList)) return;
    fileList.forEach((file) => {
      if (file?.filename) {
        removeUploadedFile(file.filename);
      }
    });
  });
};

const buildAboutPayload = (body, oldData = null, files = null) => {
  const aboutImageFile = getUploadedFile(files, "about_image");
  const bannerImageFile = getUploadedFile(files, "banner_image");
  const payload = {
    section_label:
      body.section_label !== undefined
        ? body.section_label
        : oldData?.section_label ?? null,
    company_title:
      body.company_title !== undefined
        ? body.company_title
        : oldData?.company_title ?? null,
    company_description:
      body.company_description !== undefined
        ? body.company_description
        : oldData?.company_description ?? null,
    highlights:
      body.highlights !== undefined
        ? parseJsonField(body.highlights, oldData?.highlights || [])
        : oldData?.highlights || [],
    trust_badges:
      body.trust_badges !== undefined
        ? parseJsonField(body.trust_badges, oldData?.trust_badges || [])
        : oldData?.trust_badges || [],
    choose_us_title:
      body.choose_us_title !== undefined
        ? body.choose_us_title
        : oldData?.choose_us_title ?? null,
    choose_us_subtitle:
      body.choose_us_subtitle !== undefined
        ? body.choose_us_subtitle
        : oldData?.choose_us_subtitle ?? null,
    choose_us_cards:
      body.choose_us_cards !== undefined
        ? parseJsonField(body.choose_us_cards, oldData?.choose_us_cards || [])
        : oldData?.choose_us_cards || [],
    testimonials_title:
      body.testimonials_title !== undefined
        ? body.testimonials_title
        : oldData?.testimonials_title ?? null,
    testimonials:
      body.testimonials !== undefined
        ? parseJsonField(body.testimonials, oldData?.testimonials || [])
        : oldData?.testimonials || [],
  };

  if (aboutImageFile) {
    payload.about_image = aboutImageFile.filename;
  } else if (!oldData) {
    payload.about_image = null;
  }

  if (bannerImageFile) {
    payload.banner_image = bannerImageFile.filename;
  } else if (!oldData) {
    payload.banner_image = null;
  }

  return payload;
};

/* ================= GET ACTIVE ABOUT ================= */
exports.getAbout = async (req, res) => {
  try {
    const about = await About.findOne({
      where: { is_active: true },
      order: [["id", "DESC"]],
    });

    if (!about) {
      return res.status(404).json({ message: "About content not found" });
    }

    return res.json(about);
  } catch (error) {
    console.error("GET ABOUT ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET ALL ABOUT ================= */
exports.getAboutList = async (req, res) => {
  try {
    const list = await About.findAll({
      order: [["id", "DESC"]],
    });

    return res.json(list);
  } catch (error) {
    console.error("GET ABOUT LIST ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET ABOUT BY ID ================= */
exports.getAboutById = async (req, res) => {
  try {
    const about = await About.findByPk(req.params.id);

    if (!about) {
      return res.status(404).json({ message: "About content not found" });
    }

    return res.json(about);
  } catch (error) {
    console.error("GET ABOUT BY ID ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ================= CREATE ABOUT ================= */
exports.createAbout = async (req, res) => {
  try {
    const payload = buildAboutPayload(req.body, null, req.files);

    if (!payload.company_title) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ message: "company_title is required" });
    }

    await About.update({ is_active: false }, { where: {} });

    const about = await About.create({
      ...payload,
      is_active: true,
    });

    return res.status(201).json({
      message: "About content created successfully",
      data: about,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    console.error("CREATE ABOUT ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ================= UPDATE ABOUT ================= */
exports.updateAbout = async (req, res) => {
  try {
    const about = await About.findByPk(req.params.id);
    const aboutImageFile = getUploadedFile(req.files, "about_image");
    const bannerImageFile = getUploadedFile(req.files, "banner_image");

    if (!about) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({ message: "About content not found" });
    }

    const payload = buildAboutPayload(req.body, about, req.files);

    if (aboutImageFile && about.about_image) {
      removeUploadedFile(about.about_image);
    }
    if (bannerImageFile && about.banner_image) {
      removeUploadedFile(about.banner_image);
    }

    await about.update(payload);

    return res.json({
      message: "About content updated successfully",
      data: about,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    console.error("UPDATE ABOUT ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ================= DELETE ABOUT ================= */
exports.deleteAbout = async (req, res) => {
  try {
    const about = await About.findByPk(req.params.id);

    if (!about) {
      return res.status(404).json({ message: "About content not found" });
    }

    if (about.about_image) {
      removeUploadedFile(about.about_image);
    }
    if (about.banner_image) {
      removeUploadedFile(about.banner_image);
    }

    await about.destroy();

    return res.json({ message: "About content deleted successfully" });
  } catch (error) {
    console.error("DELETE ABOUT ERROR:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};
