import { createContext, useContext } from "react";

// Carries the blog post fetched server-side (for the current SSR request's
// /blog/:id route) into BlogDetail.jsx, so the SSR-rendered HTML — and the
// <title>/<meta description> <Helmet> hoists from it — reflect the real
// post instead of a loading/empty state. Populated by entry-server.jsx on
// the server and by entry-client.jsx (reading the server's embedded JSON)
// on the client, so first render matches on both sides.
const PreloadedBlogContext = createContext(null);

export const PreloadedBlogProvider = PreloadedBlogContext.Provider;

export function usePreloadedBlog() {
  return useContext(PreloadedBlogContext);
}
