import { createContext, useContext, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((prev) => (prev === 'en' ? 'fr' : 'en')),
      t: translations[lang],
    }),
    [lang],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
