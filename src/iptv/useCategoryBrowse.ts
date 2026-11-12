import { useDeferredValue, useMemo, useState } from 'react'
import { countryOfGroup } from './countries'
import { FAVORITES, type Kind, categoriesOf, groupOf, sortByOrder } from './kinds'
import { useMedia } from './useMedia'

/** The category list, the picked category and the search for one content type. Shared by Live TV and the grid pages. */
export function useCategoryBrowse(kind: Kind) {
  const { visible, isFavorite, orderFor, activeCountries, openManage } = useMedia()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const deferred = useDeferredValue(query)

  const base = visible[kind]
  const order = orderFor(kind)
  const categories = useMemo(() => sortByOrder(categoriesOf(base), order), [base, order])
  const favoriteCount = useMemo(() => base.filter((c) => isFavorite(c)).length, [base, isFavorite])
  const selected = category === '' || category === FAVORITES || categories.some((c) => c.name === category) ? category : ''

  const items = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('tr')
    return base.filter((c) => {
      if (selected === FAVORITES ? !isFavorite(c) : selected !== '' && groupOf(c) !== selected) return false
      return !q || c.name.toLocaleLowerCase('tr').includes(q)
    })
  }, [base, selected, deferred, isFavorite])

  // While a country is picked, categories without a country go under "Diğer" instead of disappearing.
  const otherNames = useMemo(
    () => (activeCountries.length > 0 ? new Set(categories.filter((c) => countryOfGroup(c.name) === null).map((c) => c.name)) : undefined),
    [activeCountries, categories],
  )
  const rail = { categories, total: base.length, favoriteCount, selected, onSelect: setCategory, onManage: () => openManage(kind), otherNames }

  return { base, items, rail, selected, query, setQuery, deferred }
}
