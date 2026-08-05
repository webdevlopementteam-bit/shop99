import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./layout/AdminLayout";
import RequireAdminAuth from "./components/RequireAdminAuth";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/products/ProductForm";
import ProductList from "./pages/products/ProductList";
import ProductEdit from "./pages/products/ProductEdit";

import Categories from "./pages/categories/Categories";
import CategoryForm from "./pages/categories/CategoryForm";
import ParentCategories from "./pages/categories/ParentCategories";
import Brands from "./pages/brands/Brands";
import BannerPage from "./pages/banners/BannerPage";
import Order from "./pages/Order";
import CreateOffer from "./pages/CreateOffer";
import Coupons from "./pages/Coupons";
import Attributes from "./pages/Attributes";
import CategoryAttribute from "./pages/CategoryAttribute";
import SEO from "./pages/SEO";
import Footer from "../../frontend/src/components/Footer";
import FooterLinks from "./pages/Footer";
import PopularProducts from "./pages/PopularProducts";
import MostSellingProducts from "./pages/MostSellingProducts";
import LatestProducts from "./pages/LatestProducts";
import DealsProducts from "./pages/DealsProducts";
import Customers from "./pages/Customers";
import NewsletterSubscriptions from "./pages/NewsletterSubscriptions";
import OutOfStock from "./pages/OutOfStock";
import Inventory from "./pages/Inventory";
import Reviews from "./pages/Reviews";
import AdminUser from "./pages/AdminUser";
import Blogs from "./pages/Blogs";
import About from "./pages/About";
import AllOrders from "./pages/AllOrders";


function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
         <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="dark"
          newestOnTop
        />

      <Routes>

        {/* Public only — no dashboard / sidebar until JWT exists */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/register" element={<AdminRegister />} />

        {/* Auth first, then shell — unauthenticated users never mount AdminLayout */}
        <Route element={<RequireAdminAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/out-of-stock" element={<OutOfStock />} />
            <Route path="/products/add" element={<ProductForm />} />
            <Route path="/products/list" element={<ProductList />} />
            <Route path="/products/edit/:id" element={<ProductEdit />} />

            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/add" element={<CategoryForm />} />
            <Route path="/categories/edit/:id" element={<CategoryForm />} />
            <Route path="/parent-categories" element={<ParentCategories />} />

            <Route path="/orders" element={<Order />} />
            <Route path="/all-orders" element={<AllOrders />} />

            <Route path="/brands" element={<Brands />} />

            <Route path="/top-banner" element={<BannerPage />} />
            <Route path="/offers" element={<CreateOffer />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/attribute" element={<Attributes />} />
            <Route path="/category-attributes" element={<CategoryAttribute />} />

            <Route path="/seo" element={< SEO/>} />
            <Route path="/blogs" element={<Blogs />} />

            <Route path="/footer" element={<FooterLinks />} />
            <Route path="/about" element={<About />} />

            <Route path="/popular-products" element={<PopularProducts />} />
            <Route path="/most-selling-products" element={<MostSellingProducts />} />
            <Route path="/latest-products" element={<LatestProducts />} />
            <Route path="/deals-products" element={<DealsProducts />} />

            <Route path="/customers" element={<Customers />} />
            <Route
              path="/newsletter-subscriptions"
              element={<NewsletterSubscriptions />}
            />

            <Route path="/inventory" element={<Inventory />} />

            <Route path="/reviews" element={<Reviews />} />

            <Route path="/adminUser" element={<AdminUser />} />
          </Route>
        </Route>

        {/* Unknown URL → home (protected); no token → RequireAdminAuth sends to /login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
