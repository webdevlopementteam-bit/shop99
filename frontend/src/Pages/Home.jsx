// frontend/src/Pages/Home.jsx

import { highlights } from "../data";
import { useEffect, useState } from "react";
// import { useRef } from "react";
import React from "react";
import HeroCarousel from "../components/HeroCarousel";
import LatestProducts from "../components/LatestProducts";
import wheel from "../assets/products/sound-fire.jpeg";
import ads1 from "../assets/home/ads-1.jpg";
import "../assets/css/index.css"
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import { BASE_URL } from "../api/api";
import PopularProductsSlider from "../components/PopularProductsSlider";
import DealsPage from "./DealsPage";
import SEO from "../components/SEO";
import feature1 from "../assets/home/soundAndroid.jpeg";
import feature3 from "../assets/home/car-speaker.jpeg";
import feature2 from "../assets/home/car-Amplifier.jpeg";



import { getBrandsApi, 
  getPopularProductsApi,getLatestProductsApi,getMostSellingProductsApi,
  addToWishlistApi,
  getWishlistApi
} from "../api/api";

import CategorySlider from "../components/CategorySlider";
import { countProductVariantsInPayload } from "../utils/productVariants";
import { getProductCategoryLabel } from "../utils/productCategory";
import { getProductDisplayPricing } from "../utils/productPricing";

const resolveProductImage = (item) => {
  const raw =
    item?.image ??
    item?.Product?.image ??
    item?.product?.image ??
    item?.thumbnail ??
    "";

  const cleaned = String(raw).trim();
  if (!cleaned) return "/no-image.png";

  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const withoutLeadingSlash = cleaned.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("uploads/")) {
    return `${BASE_URL}/${withoutLeadingSlash}`;
  }

  return `${BASE_URL}/uploads/${withoutLeadingSlash}`;
};


const Home = () => {
  const [brands, setBrands] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [mostSellingProducts, setMostSellingProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [wishlistIds, setWishlistIds] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const featureCards = [
    {
      id: 1,
      title: "Car Android",
      shopCategory: "Car Android",
      image: feature1,
      bg: "bg-[#e8c29e]",
      dark: false,
    },
    {
      id: 2,
      title: "Car Amplifier",
      shopCategory: "Car Amplifier",
      image: feature2,
      bg: "bg-[#e8b4b4]",
      dark: false,
    },
    {
      id: 3,
      title: "Car Speaker",
      shopCategory: "Car Speaker",
      image: feature3,
      bg: "bg-[#3d79db80]",
      dark: true,
    },
  ];
  

 useEffect(() => {
  const load = async () => {
    const b = await getBrandsApi();
    setBrands(Array.isArray(b) ? [...b].reverse() : []);
  };

  load();
}, []);

  useEffect(() => {
    fetchPopular();
  }, []);

    const fetchPopular = async () => {
    try {
      const res = await getPopularProductsApi();
      setPopularProducts(Array.isArray(res) ? res : []);

    } catch (err) {
      console.error(err);
      setPopularProducts([]);
    }
  };


useEffect(() => {
  const loadWishlist = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        const data = await getWishlistApi();
        const ids = data.map(item => item.ProductId);
        setWishlistIds(ids);
      } else {
        // 🔥 Guest wishlist from localStorage
        const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
        setWishlistIds(guestWishlist);
      }
    } catch (err) {
      console.log("Wishlist load error", err);
    }
  };

  loadWishlist();
}, []);

const toggleWishlist = async (productId) => {
  const token = localStorage.getItem("token");

  try {

    // 🔥 Already in wishlist
    if (wishlistIds.includes(productId)) {
      toast.info("Already in wishlist ❤️");
      return;
    }

    if (token) {
      // ✅ Logged in user → backend save
      await addToWishlistApi({ productId });
    } else {
      // ✅ Guest user → localStorage save
      const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
      guestWishlist.push(productId);
      localStorage.setItem("guestWishlist", JSON.stringify(guestWishlist));
    }

    setWishlistIds(prev => [...prev, productId]);
    toast.success("Added to wishlist ❤️");

  } catch (err) {
    toast.error("Wishlist error",err);
  }
};

useEffect(() => {
  const loadLatestProducts = async () => {
    try {
      const data = await getLatestProductsApi();
      setLatestProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setLatestProducts([]);
    }
  };

  loadLatestProducts();
}, []);

useEffect(() => {
  const loadMostSellingProducts = async () => {
    try {
      const data = await getMostSellingProductsApi();
      setMostSellingProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setMostSellingProducts([]);
    }
  };

  loadMostSellingProducts();
}, []);


 const handleAddToCart = (item) => {
    const imageUrl = resolveProductImage(item);
    const pricing = getProductDisplayPricing(item);

    if (countProductVariantsInPayload(item) > 1) {
      navigate(`/productPage/${item.slug || item.id}`);
      toast.info("Please select a product variant first. The price will be saved according to the selected variant.");
      return;
    }

    addToCart({
      id: item.id,
      name: item.name,
      price: pricing.finalPrice,
      image: imageUrl,
    });

    toast.success("Product added to cart 🛒");
  };
  return (
    <>

        <SEO page="home" />

      {/* slider */}
     <HeroCarousel />
      {/* <div className="bg-primaryColor/30 h-[430px] overflow-hidden relative rounded-3xl mt-7 mx-side before:content-[' '] before:absolute before:w-[360px] before:h-[340px] before:bg-primaryColor before:rotate-12 before:-top-[20px] before:right-20 before:rounded-r-[50%] before:rounded-b-[50%]"></div> */}

      <CategorySlider/>
     {/* =================  shop section start (today popular pick) ================= */}
     
    <PopularProductsSlider
        popularProducts={popularProducts}
        wheel={wheel}
        toggleWishlist={toggleWishlist}
        wishlistIds={wishlistIds}
        handleAddToCart={handleAddToCart}
        setPreviewImage={setPreviewImage}
      />

      {/* ✅ PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full px-3 py-1 font-bold"
            >
              ✕
            </button>

            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

    {/* ================= FEATURE BANNERS start ================= */}

    <section className="mt-24 px-4 sm:px-8 lg:px-24">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {featureCards.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              navigate(
                `/shop?category=${encodeURIComponent(
                  item.shopCategory || item.title
                )}`
              )
            }
            className="group relative rounded-2xl overflow-hidden min-h-[220px] sm:min-h-[250px] w-full text-left"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-[220px] sm:h-[250px] object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}

      </div>
    </section>

    {/* ================= DEALS OF THE WEEK ================= */}
    
   <DealsPage
  embedded
  toggleWishlist={toggleWishlist}
  handleAddToCart={handleAddToCart}
  wishlistIds={wishlistIds}
/>


    {/* ================= SHOP BY BRAND ================= */}

    <section className="w-full overflow-hidden">
    
    {/* ================= HEADER ================= */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                    mx-4 sm:mx-8 lg:mx-24 mt-12 sm:mt-16 gap-4">

      <div className="w-full sm:w-auto">
        <h2 className="text-xl sm:text-2xl font-semibold relative 
          before:content-[' '] before:absolute before:h-[3px] 
          before:w-8 before:bg-primaryColor before:top-[38px] sm:before:top-[42px] 
          after:content-[' '] after:absolute after:w-[70%] sm:after:w-[80%] 
          after:h-6 sm:after:h-8 after:left-0 after:-bottom-2 sm:after:-bottom-3 
          after:bg-primaryColor/10 after:rounded-b-2xl">
          Shop By Brands
        </h2>
      </div>

      <div className="w-full sm:w-auto text-left sm:text-right">
        <p className="text-primaryColor font-semibold text-sm sm:text-base cursor-pointer"
          onClick={() => navigate("/brands")}>
          View All Brands 
          <i className="fa-solid fa-angles-right ml-2"></i>
        </p>
      </div>
    </div>

    {/* ================= BRANDS SECTION ================= */}
    <section className="relative mt-8 sm:mt-10 px-4 sm:px-8 lg:px-24 py-8 sm:py-10 overflow-hidden">

      {/* Blue Glow */}
      <div
        className="
          absolute
          -top-40
          -left-40
          w-[400px] sm:w-[600px]
          h-[400px] sm:h-[600px]
          rounded-full
          bg-gradient-to-r
          from-blue-300
          via-purple-300
          to-indigo-300
          opacity-30
          blur-[150px] sm:blur-[180px]
          pointer-events-none
          -z-10
        "
      />

      {/* Yellow Glow */}
      <div
        className="
          absolute
          bottom-[-150px]
          right-[-150px]
          w-[450px] sm:w-[650px]
          h-[450px] sm:h-[650px]
          rounded-full
          bg-gradient-to-r
          from-yellow-200
          via-lime-200
          to-green-200
          opacity-30
          blur-[170px] sm:blur-[200px]
          pointer-events-none
          -z-10
        "
      />

      {/* ================= GRID ================= */}
      <div
        className="
          grid
          grid-cols-2
          sm:grid-cols-3
          md:grid-cols-4
          lg:grid-cols-6
          gap-4 sm:gap-6
        "
      >
{brands?.map((brand) => (
  <div
    key={brand.id}
    onClick={() => navigate(`/shop?brand=${encodeURIComponent(brand.id)}`)}
    className="
      group
      relative
      overflow-hidden
      rounded-2xl
      bg-white
      border border-gray-100
      shadow-sm
      cursor-pointer
      transition-all duration-300
      hover:-translate-y-2
      hover:shadow-2xl
      hover:border-blue-200
    "
  >
    {/* soft hover gradient */}
    <div
      className="
        absolute inset-0
        bg-gradient-to-br
        from-blue-50
        via-white
        to-purple-50
        opacity-0
        transition-opacity duration-300
        group-hover:opacity-100
      "
    />

    {/* logo wrapper */}
    <div className="relative z-10 p-4 sm:p-5">
      <div
        className="
          h-24 sm:h-28 lg:h-32
          w-full
          rounded-2xl
          bg-gradient-to-br
          from-gray-50
          to-white
          border border-gray-100
          flex items-center justify-center
          p-4
          transition-all duration-300
          group-hover:border-blue-200
          group-hover:bg-blue-50/40
        "
      >
        {brand.image ? (
          <img
            src={`${BASE_URL}/uploads/${brand.image}`}
            alt={brand.name}
            className="
              max-h-full
              max-w-full
              object-contain
              transition-transform duration-300
              group-hover:scale-110
            "
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <p className="line-clamp-2 text-center text-sm font-bold text-gray-700">
            {brand.name}
          </p>
        )}
      </div>
    </div>
  </div>
))}
      </div>
    </section>
  </section>

    {/*=============== most selling products =================  */}

     <section className="mt-20 px-4 sm:px-8 lg:px-24">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 border rounded-2xl overflow-hidden bg-white">

          {/* ================= LEFT ADS CARD ================= */}
        <div
          className="relative flex flex-col justify-between text-center rounded-l-2xl overflow-hidden bg-cover bg-center p-8"
           style={{
            backgroundImage: `url(${ads1})`
            }}
        >

            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Content */}
            <div className="relative z-10 text-white">

              <h2 className="text-4xl font-bold text-orange-500 mb-2">
                Most Selling Products
              </h2>

              {/* <p className="text-lg font-semibold mb-3 text-white">
                Only This Week
              </p> */}

              <p className="text-sm opacity-90 mb-6 text-white">
              Customer favorites known for performance, affordability, and long-lasting reliability.
              </p>

              <button 
              onClick={() => navigate("/most-selling-products")}
              className="bg-orange-500 px-6 py-3 rounded-lgfont-semibold transition hover:bg-whitehover:text-orange-500">
                View Products
              </button>

            </div>

          </div>



     {/* ================= RIGHT PRODUCTS GRID ================= */}
     <div className="lg:col-span-4">

  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

    {mostSellingProducts?.length > 0 ? (
      mostSellingProducts.map((item) => {

        const imageUrl = resolveProductImage(item);

        const pricing = getProductDisplayPricing(item);

        return (
          <div key={item.id} className="border-l border-b">

            <div
              onClick={() => navigate(`/productPage/${item.slug || item.id}`)}
              className="
                group
                relative
                bg-white
                p-6
                text-left
                overflow-hidden
                transition-all duration-300
                hover:bg-gray-50
                hover:shadow-lg
                cursor-pointer
              "
            >

              <div className="relative">

                {/* IMAGE */}
                <img
                  src={imageUrl}
                  alt={item?.name || "Product"}
                  className="h-36 mx-auto object-contain transition duration-300 group-hover:opacity-30"
                  onError={(e) => {
                    e.target.src = "/no-image.png";
                  }}
                />

                {/* HOVER ICONS */}
                <div
                  className="
                    absolute
                    left-1/2
                    -translate-x-1/2
                    bottom-6
                    flex gap-3
                    opacity-0
                    translate-y-6
                    group-hover:opacity-100
                    group-hover:translate-y-0
                    transition duration-300
                    z-10
                  "
                >
                  {/* PREVIEW */}
                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={() => setPreviewImage(imageUrl)}
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>

                  {/* WISHLIST */}
                  <button
                    className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-orange-500 hover:text-white"
                    onClick={() => toggleWishlist(item.id)}
                  >
                    <i
                      className={`fa-heart ${
                        wishlistIds.includes(item.id)
                          ? "fa-solid text-red-500"
                          : "fa-regular"
                      }`}
                    ></i>
                  </button>

                </div>

              </div>

              {/* CATEGORY */}
              <p className="text-gray-500 text-sm mt-4">
                {getProductCategoryLabel(item) || "—"}
              </p>

              {/* TITLE */}
              <h4 className="font-semibold my-2 text-sm line-clamp-2">
                {item.name}
              </h4>

              {/* PRICE */}
              <p className="mb-2 flex flex-wrap items-center gap-2">
                {pricing.hasDiscount && pricing.oldPrice != null && (
                  <del className="text-gray-400 mr-2">
                    ₹{pricing.oldPrice.toFixed(2)}
                  </del>
                )}
                <span className="text-red-500 font-bold">
                  ₹{pricing.finalPrice.toFixed(2)}
                </span>
                {pricing.hasDiscount && pricing.discountPercent > 0 && (
                  <span className="text-xs font-medium text-green-600">
                    {pricing.discountPercent}% OFF
                  </span>
                )}
              </p>

            </div>

          </div>
        );
      })
    ) : (
      <div className="p-6 text-center col-span-4">
        No Products Found
      </div>
    )}

  </div>

</div>

        </div>
      </section>

     {/*=============== Latest Products =================  */}
      <LatestProducts
          products={latestProducts}
          setPreviewImage={setPreviewImage}
          toggleWishlist={toggleWishlist}
          wishlistIds={wishlistIds}
        />
        

       {/* ======== Highlight section ============ */}
        <section className="bg-orange-500 py-8 mt-24">

      <div className="px-4 sm:px-8 lg:px-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

        {highlights.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 group"
          >
            {/* icon box */}
            <div
              className="
                w-14 h-14
                rounded-xl
                bg-white/20
                flex items-center justify-center
                text-white text-xl
                transition
                group-hover:bg-white
                group-hover:text-orange-500
              "
            >
              <i className={item.icon}></i>
            </div>

            {/* text */}
            <p className="text-white font-semibold leading-snug">
              {item.text}
            </p>
          </div>
        ))}

      </div>
    </section>

  </>
  );
};

export default Home;
