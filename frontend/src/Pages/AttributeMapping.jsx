import { useEffect, useMemo, useState } from "react";
import { getCategoriesApi, getProductsApi } from "../api/api";

const DEFAULT_ATTRIBUTES = [
  "Size",
  "RAM",
  "Screen Size",
  "Lighting",
  "Brand",
  "Colour",
  "Quality",
  "Age",
];

const STORAGE_KEYS = {
  master: "attribute-master-list",
  category: "category-attribute-map",
  product: "product-attribute-map",
};

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeCategories(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
  return [];
}

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

const AttributeMapping = () => {
  const [mode, setMode] = useState("category");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [search, setSearch] = useState("");
  const [newAttribute, setNewAttribute] = useState("");

  const [masterAttributes, setMasterAttributes] = useState(() =>
    safeParse(STORAGE_KEYS.master, DEFAULT_ATTRIBUTES)
  );
  const [categoryMap, setCategoryMap] = useState(() =>
    safeParse(STORAGE_KEYS.category, {})
  );
  const [productMap, setProductMap] = useState(() =>
    safeParse(STORAGE_KEYS.product, {})
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.master, JSON.stringify(masterAttributes));
  }, [masterAttributes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.category, JSON.stringify(categoryMap));
  }, [categoryMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.product, JSON.stringify(productMap));
  }, [productMap]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, productRes] = await Promise.all([
          getCategoriesApi(),
          getProductsApi(),
        ]);

        const categoryRows = normalizeCategories(categoryRes);
        const productRows = normalizeProducts(productRes);

        setCategories(categoryRows);
        setProducts(productRows);

        if (!selectedCategoryId && categoryRows.length > 0) {
          setSelectedCategoryId(String(categoryRows[0].id));
        }
        if (!selectedProductId && productRows.length > 0) {
          setSelectedProductId(String(productRows[0].id));
        }
      } catch (error) {
        console.error("Failed to load category/product data", error);
      }
    };

    loadData();
  }, []);

  const currentMapped = useMemo(() => {
    if (mode === "category") {
      return categoryMap[selectedCategoryId] || [];
    }
    return productMap[selectedProductId] || [];
  }, [mode, selectedCategoryId, selectedProductId, categoryMap, productMap]);

  const visibleAttributes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return masterAttributes;
    return masterAttributes.filter((name) => name.toLowerCase().includes(query));
  }, [masterAttributes, search]);

  const mappedAttributes = visibleAttributes.filter((attr) =>
    currentMapped.includes(attr)
  );
  const unmappedAttributes = visibleAttributes.filter(
    (attr) => !currentMapped.includes(attr)
  );

  const onToggleAttribute = (attribute, checked) => {
    if (mode === "category") {
      if (!selectedCategoryId) return;
      setCategoryMap((prev) => {
        const oldList = prev[selectedCategoryId] || [];
        const nextList = checked
          ? Array.from(new Set([...oldList, attribute]))
          : oldList.filter((item) => item !== attribute);
        return { ...prev, [selectedCategoryId]: nextList };
      });
      return;
    }

    if (!selectedProductId) return;
    setProductMap((prev) => {
      const oldList = prev[selectedProductId] || [];
      const nextList = checked
        ? Array.from(new Set([...oldList, attribute]))
        : oldList.filter((item) => item !== attribute);
      return { ...prev, [selectedProductId]: nextList };
    });
  };

  const onAddAttribute = () => {
    const cleaned = newAttribute.trim();
    if (!cleaned) return;
    if (masterAttributes.some((attr) => attr.toLowerCase() === cleaned.toLowerCase())) {
      setNewAttribute("");
      return;
    }
    setMasterAttributes((prev) => [...prev, cleaned]);
    if (mode === "category" && selectedCategoryId) {
      setCategoryMap((prev) => {
        const oldList = prev[selectedCategoryId] || [];
        return { ...prev, [selectedCategoryId]: Array.from(new Set([...oldList, cleaned])) };
      });
    }
    if (mode === "product" && selectedProductId) {
      setProductMap((prev) => {
        const oldList = prev[selectedProductId] || [];
        return { ...prev, [selectedProductId]: Array.from(new Set([...oldList, cleaned])) };
      });
    }
    setNewAttribute("");
  };

  return (
    <div className="min-h-screen bg-[#f1f2f4] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl rounded border bg-white shadow-sm">
        <div className="border-b bg-[#f8f9fb] px-4 py-3">
          <h2 className="text-lg font-semibold text-[#333]">Attribute Mapping</h2>
          <p className="text-sm text-gray-600">
            Add and map attributes category-wise and product-wise.
          </p>
        </div>

        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("category")}
              className={`rounded px-4 py-2 text-sm font-medium ${
                mode === "category"
                  ? "bg-[#2b6ed2] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Category Wise
            </button>
            <button
              type="button"
              onClick={() => setMode("product")}
              className={`rounded px-4 py-2 text-sm font-medium ${
                mode === "product"
                  ? "bg-[#2b6ed2] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Product Wise
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-b px-4 py-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Category
            </label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={mode !== "category"}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Product
            </label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={mode !== "product"}
            >
              <option value="">Select product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search Attribute
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="mb-2 overflow-hidden rounded border">
            <div className="grid grid-cols-12 bg-[#2b6ed2] px-3 py-2 text-sm text-white">
              <div className="col-span-2">Action</div>
              <div className="col-span-10">Attributes</div>
            </div>

            <div className="grid grid-cols-12 border-t px-3 py-3 text-sm">
              <div className="col-span-2 font-medium text-gray-700">Mapped</div>
              <div className="col-span-10">
                {mappedAttributes.length === 0 ? (
                  <p className="text-gray-500">No mapped attributes</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-3">
                    {mappedAttributes.map((attribute) => (
                      <label
                        key={attribute}
                        className="flex items-center gap-2 rounded border bg-gray-50 px-2 py-2"
                      >
                        <input
                          type="checkbox"
                          checked
                          onChange={(e) =>
                            onToggleAttribute(attribute, e.target.checked)
                          }
                        />
                        <span>{attribute}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 border-t px-3 py-3 text-sm">
              <div className="col-span-2 font-medium text-gray-700">UnMapped</div>
              <div className="col-span-10">
                {unmappedAttributes.length === 0 ? (
                  <p className="text-gray-500">No unmapped attributes</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-3">
                    {unmappedAttributes.map((attribute) => (
                      <label
                        key={attribute}
                        className="flex items-center gap-2 rounded border bg-white px-2 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={(e) =>
                            onToggleAttribute(attribute, e.target.checked)
                          }
                        />
                        <span>{attribute}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newAttribute}
              onChange={(e) => setNewAttribute(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddAttribute();
              }}
              placeholder="Add new attribute"
              className="w-full rounded border px-3 py-2 text-sm sm:max-w-sm"
            />
            <button
              type="button"
              onClick={onAddAttribute}
              className="rounded bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Add Attribute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttributeMapping;
