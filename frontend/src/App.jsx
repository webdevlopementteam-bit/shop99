import Footer from "./components/Footer";
import Header from "./components/Header";
import Home from "./Pages/Home";
import Contact from "./Pages/Contact";
import About from "./Pages/About";
import { Routes, Route, Navigate  } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Categories from "./Pages/Categories";
import Shop from "./Pages/Shop/Shop";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import Checkout from "./Pages/Checkout";
import RequireAuth from "./components/RequireAuth";
import AccountPage from "./Pages/AccountPage";
import Cart from "./Pages/Cart";
import ProductPage from "./Pages/ProductPage";
import Wishlist from "./Pages/Wishlist";
import PaymentSuccess from "./Pages/PaymentSuccess";
import PaymentFailure from "./Pages/PaymentFailure";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import DealsPage from "./Pages/DealsPage";
import Brands from "./Pages/Brands";
import MostSellingProducts from "./Pages/MostSellingProducts";
import ReturnPage from "./Pages/return";
import Blogs from "./Pages/Blogs";
import BlogDetail from "./Pages/BlogDetail";

const App = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const isAdminPath =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/attributes" ||
    location.pathname === "/category-attribute" ||
    location.pathname === "/product-attribute";

  return (
    <>
      {!isAdminPath && <Header />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/shop" element={<Shop />} />
        {/* <Route path="/productPage" element={<ProductPage />} /> */}
        <Route path="/productPage/:slug" element={<ProductPage />} />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/most-selling-products" element={<MostSellingProducts />} />
        <Route path="/blog" element={<Blogs />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        
        <Route path="/retrun" element={<ReturnPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />


      </Routes>

      {!isAdminPath && <Footer />}
    </>
  );
};

export default App;

