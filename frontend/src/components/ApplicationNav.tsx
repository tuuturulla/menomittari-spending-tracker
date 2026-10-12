/** Section buttons keep navigation separate from the selected financial period. */
export type AppSection = 'overview' | 'transactions' | 'import' | 'backup'
const SECTIONS: { code: AppSection; name: string }[] = [
  { code: 'overview', name: 'Yhteenveto' }, { code: 'transactions', name: 'Tapahtumat' },
  { code: 'import', name: 'Tuo CSV' }, { code: 'backup', name: 'Varmuuskopio' },
]
export function ApplicationNav({ selected, disabled, onSelect }: {
  selected: AppSection; disabled: boolean; onSelect: (section: AppSection) => void
}) {
  return <nav className="application-nav" aria-label="Sovelluksen osiot">
    {SECTIONS.map((section) => <button key={section.code} type="button"
      aria-current={selected === section.code ? 'page' : undefined}
      disabled={disabled} onClick={() => onSelect(section.code)}>{section.name}</button>)}
  </nav>
}
