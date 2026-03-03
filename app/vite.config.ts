import fs from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteStaticCopy } from "vite-plugin-static-copy"

function serveDefinitionsPlugin(): Plugin {
  return {
    name: "serve-definitions",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url
        if (!url) {
          return next()
        }

        if (url === "/formats.json") {
          const filePath = path.resolve(import.meta.dirname, "../formats.json")
          try {
            const content = fs.readFileSync(filePath, "utf-8")
            res.setHeader("Content-Type", "application/json")
            res.end(content)
            return
          } catch {
            return next()
          }
        }

        if (url.startsWith("/definitions/")) {
          const fileName = url.slice("/definitions/".length)
          if (fileName.includes("..")) {
            res.statusCode = 403
            res.end("Forbidden")
            return
          }
          const filePath = path.resolve(import.meta.dirname, "../definitions", fileName)
          try {
            const content = fs.readFileSync(filePath, "utf-8")
            res.setHeader("Content-Type", "application/json")
            res.end(content)
            return
          } catch {
            return next()
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
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
    serveDefinitionsPlugin(),
  ],
  base: command === "serve" ? "/" : "/jsmarc/app/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@jsmarc/parser": path.resolve(import.meta.dirname, "../src/parser.ts"),
      "@jsmarc/helper": path.resolve(import.meta.dirname, "../src/helper.ts"),
    },
  },
}))
