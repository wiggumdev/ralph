const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://wiggum.dev" : `https://${stage}.wiggum.dev`,
}
