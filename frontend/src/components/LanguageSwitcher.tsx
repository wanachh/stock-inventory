"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n, { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "../i18n/config";

export const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const language = i18n.language.startsWith("en") ? "en" : DEFAULT_LANGUAGE;

  const changeLanguage = (nextLanguage: "th" | "en") => {
    void i18n.changeLanguage(nextLanguage);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/70 p-1 dark:border-slate-800/80 dark:bg-slate-900/60" aria-label={t("language.label")}>
      <Languages className="ml-1 h-3.5 w-3.5 text-slate-400" />
      {(["th", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => changeLanguage(code)}
          aria-pressed={language === code}
          className={`rounded-xl px-2 py-1 text-[10px] font-bold transition cursor-pointer ${language === code ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          {code === "th" ? "TH" : "EN"}
        </button>
      ))}
    </div>
  );
};