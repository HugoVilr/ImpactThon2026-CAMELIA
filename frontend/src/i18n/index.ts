import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import glCommon from "./locales/gl/common.json";

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  gl: { common: glCommon },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    ns: ["common"],
    defaultNS: "common",
    lng: "es",
    fallbackLng: "es",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
