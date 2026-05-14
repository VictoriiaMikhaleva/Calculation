import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Иначе .JPG (верхний регистр) попадает в JS-парсер и падает import analysis
  assetsInclude: ["**/*.JPG", "**/*.JPEG", "**/*.PNG", "**/*.GIF", "**/*.WEBP"],
});
