import { createContext } from "react";

// Shared dialog controls: external-link disclaimer, language-switch
// disclaimer, and the in-app document (PDF) viewer.
export const DialogContext = createContext({
  requestLanguageChange: () => {},
  openDocument: () => {},
});
