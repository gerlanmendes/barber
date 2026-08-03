// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Self-hosting (Docker): defina NITRO_PRESET=node-server para gerar um
// servidor Node em .output/server/index.mjs. Sem essa variável, o build
// continua igual ao padrão da Lovable (Cloudflare).
const preset = process.env["NITRO_PRESET"];

export default defineConfig({
  ...(preset
    ? {
        nitro: {
          preset,
          output: { dir: ".output", publicDir: ".output/public", serverDir: ".output/server" },
        } as const,
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

