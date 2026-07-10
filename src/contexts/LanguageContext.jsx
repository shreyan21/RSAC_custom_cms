import { useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContextCore";
import { hiTranslations } from "../data/translations";
import {
  getUiLabelOverride,
  getUiLabelsVersion,
  subscribeUiLabels,
} from "../data/uiLabels";

const languageStorageKey = "rsac.language";
const supportedLanguages = new Set(["en", "hi"]);

const getInitialLanguage = () => {
  if (typeof window === "undefined") {
    return "en";
  }

  // Shareable links can force a language via ?lang=hi
  // so the embedded page matches the CMS English/Hindi editing toggle.
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (supportedLanguages.has(requested)) {
    return requested;
  }

  const stored = window.localStorage.getItem(languageStorageKey);
  return supportedLanguages.has(stored) ? stored : "en";
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  // Re-render t() consumers whenever the CMS "Interface Labels" rows load or
  // change (DataProvider pushes them into the uiLabels module store).
  const [labelsVersion, setLabelsVersion] = useState(getUiLabelsVersion);

  useEffect(() => subscribeUiLabels(setLabelsVersion), []);

  const setLanguage = (value) => {
    setLanguageState(supportedLanguages.has(value) ? value : "en");
  };

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language === "hi" ? "hi" : "en-IN";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isHindi: language === "hi",
      // Static-UI translator: CMS "Interface Labels" overrides win first; in
      // Hindi an override only applies when the editor actually changed it,
      // otherwise the official term map decides; plain text is the fallback.
      t: (text) => {
        if (typeof text !== "string") {
          return text;
        }
        const override = getUiLabelOverride(text);
        if (language === "hi") {
          return override && override !== text
            ? override
            : hiTranslations[text] || text;
        }
        return override || text;
      },
    }),
    // labelsVersion is not read inside the memo but must invalidate t() when
    // the CMS label store changes (t reads the store imperatively).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, labelsVersion]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
