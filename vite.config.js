import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Calculation/",
  plugins: [react()],
  assetsInclude: ["**/*.JPG", "**/*.JPEG", "**/*.PNG", "**/*.GIF", "**/*.WEBP"],
});