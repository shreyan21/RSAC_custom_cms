process.env.NODE_ENV = "production";
process.env.CMS_SERVE_BUILT_APPS ??= "true";

await import("../server/index.js");
