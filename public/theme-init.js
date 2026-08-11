(() => {
  try {
    const dark = window.localStorage.getItem("rsac.highContrast") === "true";
    document.documentElement.classList.toggle("rsac-high-contrast", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#102b34" : "#f4f8f6");
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
})();
