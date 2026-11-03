// Prerender every route (required for adapter-static — without it only 404.html is emitted).
// SSR stays on so the prerendered HTML contains the full page content (SEO, first paint).
export const prerender = true;
// Emit /route/index.html (not /route.html) so every page works on GitHub Pages;
// internal links use trailing slashes accordingly.
export const trailingSlash = 'always';
