import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://indyjonesnl.github.io",
  base: "/frank-energie-price-history",
  trailingSlash: "always",
  output: "static",
  integrations: [sitemap(), mdx()],
  vite: { plugins: [tailwindcss()] },
  build: { format: "directory" },
});
