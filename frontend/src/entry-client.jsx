import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PreloadedProductProvider } from "./context/PreloadedProductContext.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { HelmetProvider } from "react-helmet-async";

// Server embeds the product it fetched for this exact request (see
// entry-server.jsx) as window.__PRELOADED_PRODUCT__ — reusing it here keeps
// hydration's first render identical to the server's, and skips ProductPage
// re-fetching data it was just given.
const preloadedProduct =
  typeof window !== "undefined" ? window.__PRELOADED_PRODUCT__ ?? null : null;

hydrateRoot(
  document.getElementById("root"),
  <HelmetProvider>
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <PreloadedProductProvider value={preloadedProduct}>
              <App />
            </PreloadedProductProvider>
            <ToastContainer position="top-right" autoClose={2000} />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  </HelmetProvider>
);
