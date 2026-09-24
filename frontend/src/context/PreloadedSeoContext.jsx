import { createContext, useContext } from "react";

// Carries the SEO row fetched server-side (for the current SSR request's
// page) into SEO.jsx, so the SSR-rendered HTML — and the <title>/<meta>
// tags <Helmet> hoists from it — reflect the real saved values instead of
// the generic fallback. Populated by entry-server.jsx on the server and by
// entry-client.jsx (reading the server's embedded JSON) on the client, so
// first render matches on both sides. Shape: { page, data } | null.
const PreloadedSeoContext = createContext(null);

export const PreloadedSeoProvider = PreloadedSeoContext.Provider;

export function usePreloadedSeo() {
  return useContext(PreloadedSeoContext);
}
