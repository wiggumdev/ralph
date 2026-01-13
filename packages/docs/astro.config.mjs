import cloudflare from "@astrojs/cloudflare"
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import config from "./config.mjs"

export default defineConfig({
  site: config.url,
  output: "static",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "ralph",
      description:
        "AI-agnostic agentic loop CLI. Reset context, persist learnings, ship code.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/wiggumdev/ralph" },
      ],
      customCss: ["./src/styles/custom.css", "./src/styles/tailwind.css"],
      head: [
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#FFD93D",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: true,
          },
        },
        {
          tag: "link",
          attrs: {
            href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:wght@400;500;600&display=swap",
            rel: "stylesheet",
          },
        },
      ],
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Introduction", slug: "guides/introduction" },
            { label: "Installation", slug: "guides/installation" },
            { label: "Quick Start", slug: "guides/quickstart" },
          ],
        },
        {
          label: "Core Concepts",
          items: [
            { label: "The Loop", slug: "concepts/the-loop" },
            { label: "Context Windows", slug: "concepts/context-windows" },
            { label: "Exit Conditions", slug: "concepts/exit-conditions" },
            { label: "State Persistence", slug: "concepts/state-persistence" },
          ],
        },
        {
          label: "Usage",
          items: [
            { label: "CLI Reference", slug: "usage/cli" },
            { label: "Configuration", slug: "usage/configuration" },
          ],
        },
        // {
        //   label: "Examples",
        //   items: [
        //     { label: "Large Refactors", slug: "examples/refactors" },
        //     { label: "Test Coverage", slug: "examples/testing" },
        //     { label: "Documentation", slug: "examples/documentation" },
        //     { label: "Migrations", slug: "examples/migrations" },
        //   ],
        // },
        {
          label: "Reference",
          items: [
            { label: "Architecture", slug: "reference/architecture" },
            { label: "FAQ", slug: "reference/faq" },
          ],
        },
      ],
      components: {
        Hero: "./src/components/Hero.astro",
      },
      editLink: {
        baseUrl: "https://github.com/wiggumdev/ralph/edit/main/docs/",
      },
    }),
  ],
});
