import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

const savedLang = localStorage.getItem('prescripto_lang') || 'en'

const i18n = createI18n({
    legacy: false,
    locale: savedLang,
    fallbackLocale: 'en',
    messages: { en, es },
})

export default i18n