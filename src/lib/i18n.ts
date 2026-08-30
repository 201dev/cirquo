export type Locale = "id" | "en";
const messages = { id: { profile: "Profil", notifications: "Notifikasi", logout: "Keluar dari akun", language: "Bahasa" }, en: { profile: "Profile", notifications: "Notifications", logout: "Log out", language: "Language" } } as const;
export const getLocale = (): Locale => localStorage.getItem("cirquo-locale") === "en" ? "en" : "id";
export const setLocale = (locale: Locale) => { localStorage.setItem("cirquo-locale", locale); document.documentElement.lang = locale; };
export const t = (locale: Locale, key: keyof typeof messages.id) => messages[locale][key];
