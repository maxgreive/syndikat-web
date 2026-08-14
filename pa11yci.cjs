const baseUrl = (process.env.PA11Y_BASE_URL || "https://syndikat.golf").replace(/\/$/, "");
const { executablePath } = require("puppeteer");

/**
 * Representative pages for the shared Jekyll layouts and interactive tools.
 * Override PA11Y_BASE_URL to run the same checks against a preview deployment.
 */
module.exports = {
  defaults: {
    concurrency: 2,
    runners: ["axe"],
    standard: "WCAG2AA",
    timeout: 30000,
    wait: 750,
    chromeLaunchConfig: {
      executablePath: executablePath(),
    },
    viewport: {
      width: 1280,
      height: 1024,
    },
  },
  urls: [
    "/",
    "/about/",
    "/faq/",
    "/contact/",
    "/register/",
    "/ratings/",
    "/training/",
    "/turniere/",
    "/preisvergleich/",
  ].map((path) => `${baseUrl}${path}`),
};
