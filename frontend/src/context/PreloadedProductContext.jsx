import { createContext, useContext } from "react";

// Carries the product fetched server-side (for the current SSR request's
// /productPage/:slug route) into ProductPage.jsx, so the SSR-rendered HTML —
// and the <title>/<meta description> React 19 hoists from it — reflect the
// real product instead of the generic fallback. Populated by entry-server.jsx
// on the server and by entry-client.jsx (reading the server's embedded JSON)
// on the client, so first render matches on both sides.
const PreloadedProductContext = createContext(null);

export const PreloadedProductProvider = PreloadedProductContext.Provider;

export function usePreloadedProduct() {
  return useContext(PreloadedProductContext);
}
