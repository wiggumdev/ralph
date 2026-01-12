import { domain } from "./domain";

new sst.cloudflare.x.Astro("Web", {
  domain,
  path: "packages/web",
  environment: {
    // For astro config
    SST_STAGE: $app.stage,
  },
});
