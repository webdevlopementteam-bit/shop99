import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createBlogApi,
  deleteBlogApi,
  getBlogsApi,
  IMAGE_URL,
  updateBlogApi,
} from "../api/api";

const createInitialForm = () => ({
  id: null,
  image: null,
  title: "",
  question: "",
  answer: "",
  featuresText: "",
  benefitsText: "",
  why_choose_us: "",
  conclusion: "",
  faqRows: [{ question: "", answer: "" }],
});

const toLineText = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join("\n") : "";

const normalizeFaq = (faq) => {
  if (!Array.isArray(faq) || faq.length === 0) {
    return [{ question: "", answer: "" }];
  }

  const rows = faq
    .map((item) => ({
      question: String(item?.question ?? item?.q ?? "").trim(),
      answer: String(item?.answer ?? item?.a ?? "").trim(),
    }))
    .filter((item) => item.question || item.answer);

  return rows.length > 0 ? rows : [{ question: "", answer: "" }];
};

export default function Blogs() {
  const [form, setForm] = useState(createInitialForm);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await getBlogsApi();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const resetForm = () => {
    setForm(createInitialForm());
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, image: file }));
  };

  const updateFaqRow = (idx, key, value) => {
    setForm((prev) => {
      const nextRows = prev.faqRows.map((row, i) =>
        i === idx ? { ...row, [key]: value } : row
      );
      return { ...prev, faqRows: nextRows };
    });
  };

  const addFaqRow = () => {
    setForm((prev) => ({
      ...prev,
      faqRows: [...prev.faqRows, { question: "", answer: "" }],
    }));
  };

  const removeFaqRow = (idx) => {
    setForm((prev) => {
      const nextRows = prev.faqRows.filter((_, i) => i !== idx);
      return {
        ...prev,
        faqRows: nextRows.length ? nextRows : [{ question: "", answer: "" }],
      };
    });
  };

  const buildPayload = () => {
    const features = form.featuresText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const benefits = form.benefitsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const faq = form.faqRows
      .map((row) => ({
        question: String(row.question || "").trim(),
        answer: String(row.answer || "").trim(),
      }))
      .filter((row) => row.question || row.answer);

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("question", form.question.trim());
    fd.append("answer", form.answer.trim());
    fd.append("features", JSON.stringify(features));
    fd.append("benefits", JSON.stringify(benefits));
    fd.append("why_choose_us", form.why_choose_us.trim());
    fd.append("conclusion", form.conclusion.trim());
    fd.append("faq", JSON.stringify(faq));

    if (form.image instanceof File) {
      fd.append("image", form.image);
    }

    return fd;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (form.id) {
        await updateBlogApi(form.id, payload);
        toast.success("Blog updated");
      } else {
        await createBlogApi(payload);
        toast.success("Blog created");
      }

      resetForm();
      fetchBlogs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (blog) => {
    setForm({
      id: blog.id,
      image: blog.image || null,
      title: blog.title || "",
      question: blog.question || "",
      answer: blog.answer || "",
      featuresText: toLineText(blog.features),
      benefitsText: toLineText(blog.benefits),
      why_choose_us: blog.why_choose_us || "",
      conclusion: blog.conclusion || "",
      faqRows: normalizeFaq(blog.faq),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this blog?");
    if (!ok) return;

    try {
      await deleteBlogApi(id);
      toast.success("Blog deleted");
      if (form.id === id) {
        resetForm();
      }
      fetchBlogs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete blog");
    }
  };

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Blogs Management</h1>
          <p className="text-sm text-gray-400">
            Create and manage blog content for website pages.
          </p>
        </div>
        {isEditing && (
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
            Editing
          </span>
        )}
      </div>

      <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-md space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-2 rounded-lg text-sm"
            />
          </div>
        </div>

        {form.image && (
          <div>
            <img
              src={
                form.image instanceof File
                  ? URL.createObjectURL(form.image)
                  : `${IMAGE_URL}${form.image}`
              }
              alt="Blog preview"
              className="h-24 rounded border border-gray-700"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400">Question / Intro</label>
          <textarea
            name="question"
            value={form.question}
            onChange={handleChange}
            rows={3}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Answer</label>
          <textarea
            name="answer"
            value={form.answer}
            onChange={handleChange}
            rows={3}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">
              Features (one line = one item)
            </label>
            <textarea
              name="featuresText"
              value={form.featuresText}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">
              Benefits (one line = one item)
            </label>
            <textarea
              name="benefitsText"
              value={form.benefitsText}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Why Choose Us</label>
          <textarea
            name="why_choose_us"
            value={form.why_choose_us}
            onChange={handleChange}
            rows={3}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Conclusion</label>
          <textarea
            name="conclusion"
            value={form.conclusion}
            onChange={handleChange}
            rows={3}
            className="w-full mt-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">FAQ</label>
            <button
              type="button"
              onClick={addFaqRow}
              className="text-xs bg-[#00C2A8]/20 text-[#00C2A8] px-2 py-1 rounded"
            >
              Add FAQ
            </button>
          </div>

          {form.faqRows.map((row, idx) => (
            <div key={idx} className="grid md:grid-cols-2 gap-3">
              <input
                value={row.question}
                onChange={(e) => updateFaqRow(idx, "question", e.target.value)}
                placeholder="Question"
                className="bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={row.answer}
                  onChange={(e) => updateFaqRow(idx, "answer", e.target.value)}
                  placeholder="Answer"
                  className="flex-1 bg-[#0B0F19] border border-gray-700 p-3 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeFaqRow(idx)}
                  className="px-3 bg-red-500/20 text-red-400 rounded-lg"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditing ? "Update Blog" : "Create Blog"}
          </button>
          {isEditing && (
            <button
              onClick={resetForm}
              type="button"
              className="px-6 bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-gray-800 shadow-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0B0F19] text-gray-400">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && blogs.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  No blogs found
                </td>
              </tr>
            )}
            {blogs.map((item) => (
              <tr key={item.id} className="border-t border-gray-800">
                <td className="p-3">
                  {item.image ? (
                    <img
                      src={`${IMAGE_URL}${item.image}`}
                      alt={item.title}
                      className="h-12 w-16 object-cover rounded border border-gray-700"
                    />
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="p-3">{item.title}</td>
                <td className="p-3">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-3 text-center space-x-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-400"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400"
                    type="button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
