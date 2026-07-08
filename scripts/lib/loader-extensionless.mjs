// Node ESM resolve hook: lets CLI scripts import the Vite frontend's src/data
// modules, which use extensionless relative specifiers ("./translations").
// Vite resolves those; plain node does not. On a failed relative resolve, retry
// with a ".js" suffix. Dev-only; never bundled into the site.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?js$|\.json$/.test(specifier)
    ) {
      try {
        return await nextResolve(`${specifier}.js`, context);
      } catch {
        // fall through to the original error
      }
    }
    throw error;
  }
}
