import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "ralph",
      description:
        "AI-agnostic agentic loop CLI. Reset context, persist learnings, ship code.",
      logo: {
        light: "./src/assets/ralph-logo-light.svg",
        dark: "./src/assets/ralph-logo-dark.svg",
        replacesTitle: false,
      },
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
            href: "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap",
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
            { label: "With Claude Code", slug: "usage/claude-code" },
            { label: "With OpenCode", slug: "usage/opencode" },
            { label: "With Other Tools", slug: "usage/other-tools" },
          ],
        },
        {
          label: "Examples",
          items: [
            { label: "Large Refactors", slug: "examples/refactors" },
            { label: "Test Coverage", slug: "examples/testing" },
            { label: "Documentation", slug: "examples/documentation" },
            { label: "Migrations", slug: "examples/migrations" },
          ],
        },
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
