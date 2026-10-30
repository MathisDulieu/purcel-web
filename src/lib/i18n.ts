import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'
import ro from '@/locales/ro.json'
import type { Language } from '@/lib/types'

export const LANGUAGES: Language[] = ['en', 'fr', 'ro']
const STORAGE_KEY = 'purcel.lang'

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'en' || value === 'fr' || value === 'ro') return value
  } catch {
    return 'en'
  }
  return 'en'
}

export function rememberLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    return
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ro: { translation: ro },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})
document.documentElement.lang = i18n.language

export default i18n
