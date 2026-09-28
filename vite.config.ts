/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Published at the domain root: https://playmaker.bbroot.com/
  base: "/",
  plugins: [react(), tailwindcss()],
  server: { port: 5183, host: true },
  preview: { port: 5184, host: true },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
