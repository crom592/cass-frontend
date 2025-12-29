import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ko from './locales/ko.json'

export type MessageSchema = typeof en

const STORAGE_KEY = 'cass-locale'

function getStoredLocale(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ['ko', 'en'].includes(stored)) {
      return stored
    }
    // Check browser language preference
    const browserLang = navigator.language.split('-')[0]
    if (['ko', 'en'].includes(browserLang)) {
      return browserLang
    }
  }
  return 'ko' // Default to Korean
}

export function setStoredLocale(locale: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
}

export const i18n = createI18n<[MessageSchema], 'ko' | 'en'>({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: 'en',
  messages: {
    ko,
    en,
  },
})

export default i18n
