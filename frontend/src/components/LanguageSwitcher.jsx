import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
    const { i18n } = useTranslation()
    const isES = i18n.language === 'es'

    const toggle = () => {
        i18n.changeLanguage(isES ? 'en' : 'es')
    }

    return (
        <button
            onClick={toggle}
            title={isES ? 'Switch to English' : 'Cambiar a Español'}
            aria-label="Toggle language"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 cursor-pointer select-none"
        >
            <span className="text-base leading-none" aria-hidden="true">
                {isES ? '🇪🇸' : '🇺🇸'}
            </span>
            <span className="text-xs font-semibold text-slate-600 tracking-wide">
                {isES ? 'ES' : 'EN'}
            </span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
        </button>
    )
}

export default LanguageSwitcher