const EXTENSION_MAP: Record<string, string> = {
  // TypeScript/JavaScript
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",

  // Python
  py: "python",
  pyi: "python",

  // Rust
  rs: "rust",

  // Go
  go: "go",

  // Ruby
  rb: "ruby",

  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",

  // Config/Data
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",

  // Markup
  md: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",

  // C family
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",

  // Java/Kotlin
  java: "java",
  kt: "kotlin",
  kts: "kotlin",

  // Other
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  makefile: "make",
};

const LEADING_DOT_REGEX = /^\./;

export function getFiletypeFromPath(filePath: string): string {
  const filename = filePath.split("/").pop() ?? "";
  const lowerFilename = filename.toLowerCase();

  // Handle special filenames
  if (lowerFilename === "dockerfile") {
    return "dockerfile";
  }
  if (lowerFilename === "makefile") {
    return "make";
  }

  // Extract extension
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[ext] ?? "text";
}

export function getFiletypeFromExtension(ext: string): string {
  const normalized = ext.toLowerCase().replace(LEADING_DOT_REGEX, "");
  return EXTENSION_MAP[normalized] ?? "text";
}
