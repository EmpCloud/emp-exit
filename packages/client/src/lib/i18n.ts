import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import ar from "@/locales/ar.json";
import pt from "@/locales/pt.json";
import ja from "@/locales/ja.json";
import zh from "@/locales/zh.json";

const RTL_LANGUAGES = ["ar"];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
  pt: { translation: pt },
  ja: { translation: ja },
  zh: { translation: zh },
};

const savedLanguage = localStorage.getItem("emp-exit-language") || "en";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

// Keep document-level language metadata in sync on init and every change.
function applyDocumentLanguage(lng: string) {
  const baseLanguage = lng.split("-")[0];
  const dir = RTL_LANGUAGES.includes(baseLanguage) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
  document.title = i18n.t("app.title", { lng });
}

applyDocumentLanguage(i18n.resolvedLanguage || savedLanguage);

i18n.on("languageChanged", (lng: string) => {
  localStorage.setItem("emp-exit-language", lng);
  applyDocumentLanguage(i18n.resolvedLanguage || lng);
});

export default i18n;
