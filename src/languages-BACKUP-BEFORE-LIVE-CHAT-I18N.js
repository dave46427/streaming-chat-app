export const DEFAULT_LANGUAGE = "en";

export const supportedLanguages = {
  en: "English",
  sv: "Svenska",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski"
};

export const translations = {
  en: {
    appName: "DavaBridge",
    language: "Language",
    automatic: "Automatic (device language)",
    settingsAppearance: "SETTINGS & APPEARANCE",
    homeSubtitle: "Connect your platforms and bring your communities together.",
    connectAll: "CONNECT ALL",
    combinedChat: "COMBINED CHAT",
    connected: "Connected",
    notConnected: "Not connected",
    waitingForMessages: "Waiting for live messages..."
  },

  sv: {
    appName: "DavaBridge",
    language: "Språk",
    automatic: "Automatiskt (enhetens språk)",
    settingsAppearance: "INSTÄLLNINGAR OCH UTSEENDE",
    homeSubtitle: "Anslut dina plattformar och samla dina gemenskaper.",
    connectAll: "ANSLUT ALLA",
    combinedChat: "KOMBINERAD CHATT",
    connected: "Ansluten",
    notConnected: "Inte ansluten",
    waitingForMessages: "Väntar på livemeddelanden..."
  },

  de: {
    appName: "DavaBridge",
    language: "Sprache",
    automatic: "Automatisch (Gerätesprache)",
    settingsAppearance: "EINSTELLUNGEN UND DARSTELLUNG",
    homeSubtitle: "Verbinde deine Plattformen und bringe deine Communities zusammen.",
    connectAll: "ALLE VERBINDEN",
    combinedChat: "KOMBINIERTER CHAT",
    connected: "Verbunden",
    notConnected: "Nicht verbunden",
    waitingForMessages: "Warte auf Live-Nachrichten..."
  },

  fr: {
    appName: "DavaBridge",
    language: "Langue",
    automatic: "Automatique (langue de l’appareil)",
    settingsAppearance: "PARAMÈTRES ET APPARENCE",
    homeSubtitle: "Connectez vos plateformes et rassemblez vos communautés.",
    connectAll: "TOUT CONNECTER",
    combinedChat: "CHAT COMBINÉ",
    connected: "Connecté",
    notConnected: "Non connecté",
    waitingForMessages: "En attente de messages en direct..."
  },

  es: {
    appName: "DavaBridge",
    language: "Idioma",
    automatic: "Automático (idioma del dispositivo)",
    settingsAppearance: "AJUSTES Y APARIENCIA",
    homeSubtitle: "Conecta tus plataformas y reúne a tus comunidades.",
    connectAll: "CONECTAR TODO",
    combinedChat: "CHAT COMBINADO",
    connected: "Conectado",
    notConnected: "No conectado",
    waitingForMessages: "Esperando mensajes en directo..."
  },

  it: {
    appName: "DavaBridge",
    language: "Lingua",
    automatic: "Automatico (lingua del dispositivo)",
    settingsAppearance: "IMPOSTAZIONI E ASPETTO",
    homeSubtitle: "Collega le tue piattaforme e riunisci le tue community.",
    connectAll: "COLLEGA TUTTO",
    combinedChat: "CHAT COMBINATA",
    connected: "Connesso",
    notConnected: "Non connesso",
    waitingForMessages: "In attesa di messaggi in diretta..."
  },

  pt: {
    appName: "DavaBridge",
    language: "Idioma",
    automatic: "Automático (idioma do dispositivo)",
    settingsAppearance: "DEFINIÇÕES E APARÊNCIA",
    homeSubtitle: "Ligue as suas plataformas e reúna as suas comunidades.",
    connectAll: "LIGAR TUDO",
    combinedChat: "CHAT COMBINADO",
    connected: "Ligado",
    notConnected: "Não ligado",
    waitingForMessages: "A aguardar mensagens em direto..."
  },

  nl: {
    appName: "DavaBridge",
    language: "Taal",
    automatic: "Automatisch (apparaattaal)",
    settingsAppearance: "INSTELLINGEN EN WEERGAVE",
    homeSubtitle: "Verbind je platforms en breng je communities samen.",
    connectAll: "ALLES VERBINDEN",
    combinedChat: "GECOMBINEERDE CHAT",
    connected: "Verbonden",
    notConnected: "Niet verbonden",
    waitingForMessages: "Wachten op liveberichten..."
  },

  pl: {
    appName: "DavaBridge",
    language: "Język",
    automatic: "Automatycznie (język urządzenia)",
    settingsAppearance: "USTAWIENIA I WYGLĄD",
    homeSubtitle: "Połącz swoje platformy i zgromadź społeczności w jednym miejscu.",
    connectAll: "POŁĄCZ WSZYSTKIE",
    combinedChat: "POŁĄCZONY CZAT",
    connected: "Połączono",
    notConnected: "Nie połączono",
    waitingForMessages: "Oczekiwanie na wiadomości na żywo..."
  }
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