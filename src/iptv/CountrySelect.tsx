import { ChevronDown } from 'lucide-react'
import { countryName, flagOf } from './countries'
import { useMedia } from './useMedia'

/**
 * Country filter as a plain dropdown. The list opens only when clicked and is drawn by the system,
 * so it always sits on top of the page with a solid background. Channels whose country is unknown stay visible.
 */
export function CountrySelect() {
  const { countryOptions, activeCountries, setCountries, otherCount } = useMedia()
  if (countryOptions.length === 0) return null

  const many = activeCountries.length > 1
  const value = many ? '__many__' : (activeCountries[0] ?? '')

  return (
    <div>
      <label htmlFor="country-select" className="label mb-1.5 block">
        Ülke
      </label>
      <div className="relative">
        <select
          id="country-select"
          value={value}
          onChange={(e) => setCountries(e.target.value === '' ? [] : [e.target.value])}
          className="select-solid"
        >
          <option value="">Tüm ülkeler</option>
          {many && (
            <option value="__many__" disabled>
              {activeCountries.length} ülke seçili
            </option>
          )}
          {countryOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {flagOf(o.code)} {countryName(o.code)} ({o.count.toLocaleString('tr-TR')})
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
      </div>
      {activeCountries.length > 0 && otherCount > 0 && (
        <p className="mt-1.5 text-xs text-[var(--subtle)]">Ülkesi belirsiz {otherCount.toLocaleString('tr-TR')} öğe de gösterilir.</p>
      )}
    </div>
  )
}
