"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "../i18n/config";

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    let savedLanguage: string | null = null;
    try {
      savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Use the default language when storage is unavailable.
    }
    const language = savedLanguage === "en" || savedLanguage === "th" ? savedLanguage : DEFAULT_LANGUAGE;
    if (i18n.language !== language) void i18n.changeLanguage(language);

    const handleLanguageChanged = (lng: string) => {
      document.documentElement.lang = lng;
      document.title =
        lng === "en"
          ? "StockPulse - Smart Inventory & FIFO Valuation System"
          : "StockPulse - ระบบจัดการสต็อกและต้นทุนสินค้า (Real-Cost FIFO)";
    };

    i18n.on("languageChanged", handleLanguageChanged);
    handleLanguageChanged(i18n.language);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};