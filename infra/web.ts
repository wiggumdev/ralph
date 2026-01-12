import { domain } from "./domain";

new sst.cloudflare.x.Astro("RalphDocs", {
  domain,
  path: "packages/docs",
  environment: {
    // For astro config
    SST_STAGE: $app.stage,
  },
});
