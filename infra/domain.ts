export const domain = (() => {
  if ($app.stage === "production") {
    return "wiggum.dev";
  }
  if ($app.stage === "dev") {
    return "dev.wiggum.dev";
  }
  return `${$app.stage}.dev.wiggum.dev`;
})();
