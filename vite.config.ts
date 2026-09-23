/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Published as a project page: https://dwainyu.github.io/tft-training-log/
  base: "/tft-training-log/",
  plugins: [react(), tailwindcss()],
  server: { port: 5183, host: true },
  preview: { port: 5184, host: true },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
