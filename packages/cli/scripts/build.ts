import solidPlugin from "@opentui/solid/bun-plugin";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "bun",
  outdir: "./build",
  plugins: [solidPlugin],
  compile: {
    target: "bun-darwin-arm64",
    outfile: `${process.env.HOME}/.local/bin/ralph`,
  },
});

console.log("Build complete: ~/.local/bin/ralph");
