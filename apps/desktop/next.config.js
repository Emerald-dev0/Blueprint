/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri has no Node server: the renderer is a bundle of static files served
  // from `out/` over the `tauri://` (macOS/Linux) or `http://tauri.localhost`
  // (Windows) custom protocol.
  output: 'export',
  images: {
    unoptimized: true,
  },

  // Emit `ai/index.html` instead of `ai.html`.
  //
  // Tauri's asset resolver is a static directory handler, not a framework
  // router. Extension-less `.html` resolution is inconsistent across the
  // WebView2 (Windows) and WebKitGTK (Linux) backends, which means a route
  // could work in `next dev` and 404 inside the packaged Windows/Linux app.
  // Directory-style output is resolved identically everywhere, so deep links
  // and reloads behave the same on all three desktop platforms.
  trailingSlash: true,

  // Deterministic, content-addressed static output. Without this the export
  // embeds a build id that changes every run, producing a noisy diff and
  // breaking any caching of the bundle across releases.
  generateBuildId: async () => {
    const { version } = require('./package.json');
    return `blueprint-${version}`;
  },
};

module.exports = nextConfig;
