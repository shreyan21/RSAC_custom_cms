import { useEffect } from "react";
import { useSiteSettings } from "../../hooks/useData";

const tokenMap = {
  primary: "--rsac-primary",
  primaryDark: "--rsac-primary-dark",
  secondary: "--rsac-secondary",
  ink: "--rsac-ink",
  surface: "--rsac-surface",
  accent: "--rsac-accent",
  radius: "--rsac-radius",
  contentWidth: "--rsac-content-width",
  motionScale: "--rsac-motion-scale",
};

const colorKeys = new Set([
  "primary",
  "primaryDark",
  "secondary",
  "ink",
  "surface",
  "accent",
]);

const normalizeToken = (key, value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (colorKeys.has(key)) {
    return CSS.supports("color", String(value)) ? String(value) : null;
  }

  if (key === "motionScale") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? String(Math.min(2, Math.max(0, numericValue)))
      : null;
  }

  if (key === "radius" || key === "contentWidth") {
    return CSS.supports("width", String(value)) ? String(value) : null;
  }

  return String(value);
};

const ThemeController = () => {
  const { appearance } = useSiteSettings();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.rsacTheme = "cms";

    Object.entries(tokenMap).forEach(([key, variable]) => {
      const value = normalizeToken(key, appearance?.[key]);

      if (value !== null) {
        root.style.setProperty(variable, value);
      }
    });

    return () => {
      delete root.dataset.rsacTheme;
      Object.values(tokenMap).forEach((variable) =>
        root.style.removeProperty(variable)
      );
    };
  }, [appearance]);

  return null;
};

export default ThemeController;
