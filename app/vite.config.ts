import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteStaticCopy } from "vite-plugin-static-copy"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "../definitions/*",
          dest: "definitions",
        },
        {
          src: "../formats.json",
          dest: ".",
        },
      ],
    }),
  ],
  base: "/jsmarc/app/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@jsmarc/parser": path.resolve(__dirname, "../src/parser.ts"),
      "@jsmarc/helper": path.resolve(__dirname, "../src/helper.ts"),
    },
  },
})
