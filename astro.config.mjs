import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://moscow.adnomads.ru",
  base: "/",
  outDir: "./dist",
});
