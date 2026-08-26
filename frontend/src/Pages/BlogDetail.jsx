import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { BASE_URL, getBlogByIdApi } from "../api/api";

const toText = (value) => (value == null ? "" : String(value).trim());

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

  const title = toText(blog.title) || "Untitled Blog";
  const metaTitle = toText(blog.meta_title) || title;
  const metaDescription = toText(blog.meta_description);
  const image = getBlogImage(blog.image);
  const canonicalUrl = `https://www.shop99.co.in/blog/${blog.slug || blog.id}`;

  return (
    <div className="px-4 sm:px-8 lg:px-24 py-10 sm:py-14">
      <Helmet>
        <title>{metaTitle}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
        {blog.meta_keywords && <meta name="keywords" content={blog.meta_keywords} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        {blog.image && <meta property="og:image" content={image} />}
      </Helmet>

      <Link to="/blog" className="text-sm text-orange-600 font-medium">
        ← Back to blogs
      </Link>

      <article className="mt-6 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mt-3 leading-tight">
          {title}
        </h1>

        <p className="text-sm text-gray-500 mt-3 uppercase tracking-wide">
          SHOP99 / {formatBlogDate(blog.created_at || blog.createdAt)} / BLOG
        </p>

        <img
          src={image}
          alt={title}
          className="w-full mt-6 rounded-2xl border border-gray-200 max-h-[520px] object-cover"
          onError={(e) => {
            e.currentTarget.src = "/no-image.png";
          }}
        />

        {blog.content ? (
          <div
            className="blog-content mt-8"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        ) : (
          <p className="mt-8 text-gray-500">No content yet.</p>
        )}
      </article>
    </div>
  );
}
