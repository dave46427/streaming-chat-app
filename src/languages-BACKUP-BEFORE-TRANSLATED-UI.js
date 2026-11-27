export const DEFAULT_LANGUAGE = "en";

export const supportedLanguages = {
  en: "English",
  sv: "Svenska",
  de: "Deutsch",
  fr: "Francais",
  es: "Espanol",
  it: "Italiano",
  pt: "Portugues",
  nl: "Nederlands",
  pl: "Polski"
};

export const translations = {
  en: {
    appName: "DavaBridge",
    settings: "Settings",
    language: "Language",
    automatic: "Automatic (device language)",
    connectAll: "Connect All",
    combinedChat: "Combined Chat",
    notConnected: "Not connected",
    waitingForMessages: "Waiting for live messages..."
  },

  sv: {
    appName: "DavaBridge",
    settings: "Installningar",
    language: "Sprak",
    automatic: "Automatiskt (enhetens sprak)",
    connectAll: "Anslut alla",
    combinedChat: "Kombinerad chatt",
    notConnected: "Inte ansluten",
    waitingForMessages: "Vantar pa livemeddelanden..."
  },

  de: {},
  fr: {},
  es: {},
  it: {},
  pt: {},
  nl: {},
  pl: {}
};

export function normaliseLanguage(value) {
  return String(value || DEFAULT_LANGUAGE)
    .trim()
    .toLowerCase()
    .split("-")[0];
}

export function detectDeviceLanguage() {
  const detected =
    navigator.languages?.[0] ||
    navigator.language ||
    document.documentElement.lang ||
    DEFAULT_LANGUAGE;

  const code = normaliseLanguage(detected);

  return supportedLanguages[code] ? code : DEFAULT_LANGUAGE;
}

export function getSavedLanguage() {
  const saved = localStorage.getItem("davabridge_language");

  if (!saved || saved === "auto") {
    return detectDeviceLanguage();
  }

  const code = normaliseLanguage(saved);

  return supportedLanguages[code] ? code : DEFAULT_LANGUAGE;
}

export function saveLanguage(value) {
  if (!value || value === "auto") {
    localStorage.setItem("davabridge_language", "auto");
    return detectDeviceLanguage();
  }

  const code = normaliseLanguage(value);

  localStorage.setItem(
    "davabridge_language",
    supportedLanguages[code] ? code : DEFAULT_LANGUAGE
  );

  return supportedLanguages[code] ? code : DEFAULT_LANGUAGE;
}

export function translate(language, key) {
  const code = normaliseLanguage(language);

  return (
    translations[code]?.[key] ??
    translations[DEFAULT_LANGUAGE]?.[key] ??
    key
  );
}
