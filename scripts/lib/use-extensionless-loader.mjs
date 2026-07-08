// Register the extensionless resolve hook, then hand off to the real script.
// Usage: node --import ./scripts/lib/use-extensionless-loader.mjs <script> [args]
import { register } from "node:module";
register("./loader-extensionless.mjs", import.meta.url);
