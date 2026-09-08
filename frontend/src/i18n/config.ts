import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "./locales/th.json";
import en from "./locales/en.json";

export const DEFAULT_LANGUAGE = "th" as const;
export const LANGUAGE_STORAGE_KEY = "stockpulse_language";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { th: { translation: th }, en: { translation: en } },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

export default i18n;