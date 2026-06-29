import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language

  function toggle(lang) {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  return (
    <div className="flex items-center gap-0.5 bg-surface-container rounded-full p-0.5 shrink-0">
      <button
        onClick={() => toggle('en')}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border-none ${
          current === 'en'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label="Switch to English"
        aria-pressed={current === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => toggle('sw')}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border-none ${
          current === 'sw'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label="Badilisha lugha kuwa Kiswahili"
        aria-pressed={current === 'sw'}
      >
        SW
      </button>
    </div>
  )
}
