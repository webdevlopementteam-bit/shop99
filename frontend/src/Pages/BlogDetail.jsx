import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import { BASE_URL, getBlogByIdApi } from "../api/api";

const toText = (value) => (value == null ? "" : String(value).trim());

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeFaq = (value) => {
  const rows = normalizeArray(value);
  return rows
    .map((item) => ({
      question: toText(item?.question ?? item?.q),
      answer: toText(item?.answer ?? item?.a),
    }))
    .filter((item) => item.question || item.answer);
};

const getBlogImage = (image) => {
  const raw = toText(image);
  if (!raw) return "/no-image.png";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${BASE_URL}/uploads/${raw.replace(/^\/+/, "")}`;
};

function formatBlogDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const data = await getBlogByIdApi(id);
        if (!cancelled) setBlog(data);
      } catch (e) {
        if (!cancelled) {
          setBlog(null);
          setError(e?.response?.data?.message || "Blog not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setOpenFaqIndex(0);
  }, [id]);

  const features = useMemo(() => normalizeArray(blog?.features), [blog?.features]);
  const benefits = useMemo(() => normalizeArray(blog?.benefits), [blog?.benefits]);
  const faq = useMemo(() => normalizeFaq(blog?.faq), [blog?.faq]);

  if (loading) {
    return <div className="px-4 sm:px-8 lg:px-24 py-12 text-gray-600">Loading blog...</div>;
  }

  if (!blog) {
    return (
      <div className="px-4 sm:px-8 lg:px-24 py-12">
        <p className="text-red-600">{error || "Blog not found"}</p>
        <Link to="/blog" className="inline-block mt-4 text-orange-600 font-medium">
          Back to blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 lg:px-24 py-10 sm:py-14">
      <SEO page="blog" />

      <Link to="/blog" className="text-sm text-orange-600 font-medium">
        ← Back to blogs
      </Link>

      <article className="mt-6 max-w-4xl mx-auto">
        {/* <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Shop99 Blog</p> */}
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mt-3 leading-tight">
          {toText(blog.title) || "Untitled Blog"}
        </h1>

        <p className="text-sm text-gray-500 mt-3 uppercase tracking-wide">
          SHOP99 / {formatBlogDate(blog.created_at || blog.createdAt)} / BLOG
        </p>

        <img
          src={getBlogImage(blog.image)}
          alt={toText(blog.title) || "Blog image"}
          className="w-full mt-6 rounded-2xl border border-gray-200 max-h-[520px] object-cover"
          onError={(e) => {
            e.currentTarget.src = "/no-image.png";
          }}
        />

        {toText(blog.question) && (
          <section className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-900">{toText(blog.question)}</h2>
            {toText(blog.answer) && (
              <p className="mt-3 text-gray-700 leading-7">{toText(blog.answer)}</p>
            )}
          </section>
        )}

        {features.length > 0 && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">Features</h3>
            <ul className="mt-3 list-disc pl-5 text-gray-700 space-y-2">
              {features.map((item, idx) => (
                <li key={`f-${idx}`}>{toText(item)}</li>
              ))}
            </ul>
          </section>
        )}

        {benefits.length > 0 && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">Benefits</h3>
            <ul className="mt-3 list-disc pl-5 text-gray-700 space-y-2">
              {benefits.map((item, idx) => (
                <li key={`b-${idx}`}>{toText(item)}</li>
              ))}
            </ul>
          </section>
        )}

        {toText(blog.why_choose_us) && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">Why Choose Us</h3>
            <p className="mt-3 text-gray-700 leading-7">{toText(blog.why_choose_us)}</p>
          </section>
        )}

        {toText(blog.conclusion) && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">Conclusion</h3>
            <p className="mt-3 text-gray-700 leading-7">{toText(blog.conclusion)}</p>
          </section>
        )}

        {faq.length > 0 && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900">FAQ</h3>
            <div className="mt-3 space-y-4">
              {faq.map((item, idx) => (
                <div key={`q-${idx}`} className="rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex((prev) => (prev === idx ? -1 : idx))}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <p className="font-medium text-gray-900 pr-4">{item.question}</p>
                    <span className="text-orange-600 text-lg leading-none">
                      {openFaqIndex === idx ? "−" : "+"}
                    </span>
                  </button>
                  {item.answer && (
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        openFaqIndex === idx
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4">
                          <p className="text-gray-700">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
