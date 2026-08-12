import fs from "fs"
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

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
    {
      name: "copy-static-assets",
      apply: "build",
      closeBundle() {
        const distDir = path.resolve(import.meta.dirname, "dist");
        const projectRoot = path.resolve(import.meta.dirname, "..");

        // Copy formats.json to dist/
        copyFileSync(
          path.resolve(projectRoot, "formats.json"),
          path.resolve(distDir, "formats.json"),
        );

        // Copy definitions/* to dist/definitions/
        const definitionsDest = path.resolve(distDir, "definitions");
        if (!existsSync(definitionsDest)) mkdirSync(definitionsDest, { recursive: true });
        const definitionsSrc = path.resolve(projectRoot, "definitions");
        for (const file of fs.readdirSync(definitionsSrc)) {
          copyFileSync(
            path.resolve(definitionsSrc, file),
            path.resolve(definitionsDest, file),
          );
        }
      },
    },
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
