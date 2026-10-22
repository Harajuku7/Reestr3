import { draftHeritage, draftMuseum } from './catalog-data.mjs'

export const people = [
  {
    id: "shor",
    name: "Шорцы",
    eyebrow: "Коренной малочисленный народ",
    image: "assets/shor-culture.webp",
    alt: "Участники культурной программы в традиционных костюмах у деревянного дома",
    area: "Юг Кузбасса, Горная Шория, бассейны рек Кондомы и Мрас-Су",
    summary:
      "Коренной малочисленный тюркоязычный народ Кузбасса, проживающий в горно-таежной местности. Основными хозяйственными занятиями шорцев традиционно являлись охота и собирательство, с приходом русских получило распространение ручное мотыжное земледелие. Духовная культура характеризуется религиозным синкретизмом, органично объединяющим родовые культы, восходящие к анимизму, шаманизм и христианство.",
    source: "https://www.culture.ru/events/6780025/programma-tradicii-i-obryady-shorskogo-naroda"
  },
  {
    id: "teleut",
    name: "Телеуты",
    eyebrow: "Коренной малочисленный народ",
    image: "assets/teleut-festival.jpg",
    alt: "Участница телеутского национального праздника в традиционном головном уборе",
    area: "Беловский и Гурьевский округа, бассейны Большого и Малого Бачата",
    summary:
      "Коренной малочисленный тюркоязычный народ Кузбасса. Телеуты традиционно являлись скотоводами, перешедшими на оседлый образ жизни. Бачатские телеуты славятся своими ремеслами, многие из которых бытуют по сей день. Из традиционных верований сохраняются пережитки родовых культов, ранее широкое распространение имел шаманизм.",
    source: "https://visit-kuzbass.ru/events/regionalnyij-teleutskij-naczionalnyij-prazdnik-edinstva-tele-kaan"
  }
]

export const categories = [
  {
    id: "everyday",
    label: "Культура быта",
    index: "01",
    items: [
      "Процессы, связанные с обустройством быта",
      "Технология приготовления пищи",
      "Способ ношения традиционного костюма"
    ]
  },
  {
    id: "production",
    label: "Культура производства",
    index: "02",
    items: [
      "Строительные технологии",
      "Технологии изготовления костюма",
      "Традиционные ремесла",
      "Хозяйственные занятия: охота, собирательство, земледелие и т. д."
    ]
  },
  {
    id: "mythology",
    label: "Мифологические представления",
    index: "03",
    items: ["Анимизм", "Космологические представления", "Суеверия"]
  },
  {
    id: "oral-performance",
    label: "Устное народное творчество и исполнительские искусства",
    index: "04",
    items: ["Фольклорные формы", "Танцы", "Песни", "Народный театр", "Народная музыка"]
  },
  {
    id: "rituals",
    label: "Традиционная обрядность",
    index: "05",
    items: ["Сезонные обряды", "Обряды жизненного цикла", "Окказиональные обряды"]
  },
  {
    id: "games",
    label: "Традиционные игры",
    index: "06",
    items: ["Ролевые", "Подвижные", "Состязания"]
  }
]

export const catalogItems = draftHeritage
export const registryRecords = [...draftHeritage, ...draftMuseum]

export const subcategories = {
  everyday: { dwelling: 'Обустройство быта', food: 'Приготовление пищи', costume: 'Ношение костюма' },
  production: { building: 'Строительные технологии', costume: 'Изготовление костюма', crafts: 'Традиционные ремёсла', livelihood: 'Хозяйственные занятия' },
  mythology: { animism: 'Анимизм', cosmology: 'Космологические представления', beliefs: 'Поверья и суеверия' },
  'oral-performance': { folklore: 'Фольклорные формы', dance: 'Танцы', songs: 'Песни', theatre: 'Народный театр', music: 'Народная музыка' },
  rituals: { seasonal: 'Сезонные обряды', 'life-cycle': 'Обряды жизненного цикла', occasional: 'Окказиональные обряды' },
  games: { role: 'Ролевые игры', active: 'Подвижные игры', competition: 'Состязания' },
}

export const statuses = {
  preserved: "Сохраняется",
  partial: "Частично сохраняется",
  transformed: "Трансформировалось",
  lost: "Утрачено",
  unknown: "Требует уточнения"
}

export const defaultFilters = Object.freeze({ query: '', people: 'all', category: 'all', subcategory: 'all', status: 'all', place: 'all', media: 'all', type: 'heritage', sort: 'number', view: 'list', page: 1 })
export const pageSize = 6
const personNames = Object.fromEntries(people.map(person => [person.id, person.name]))
const categoryNames = Object.fromEntries(categories.map(category => [category.id, category.label]))
export const normalizeSearch = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export function filterCatalog(items, input = {}) {
  const filters = { ...defaultFilters, ...input }
  const words = normalizeSearch(filters.query).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    const matchesPeople = filters.people === "all" || item.people === filters.people
    const matchesCategory = filters.category === "all" || item.category === filters.category
    const matchesStatus = filters.status === "all" || item.status === filters.status
    const haystack = normalizeSearch([item.code, item.title, item.place, item.summary, ...(item.description ?? []), personNames[item.people], categoryNames[item.category], subcategories[item.category]?.[item.subcategory]].join(' '))
    return matchesPeople && matchesCategory && matchesStatus
      && (filters.type === 'all' || item.type === filters.type)
      && (filters.subcategory === 'all' || item.subcategory === filters.subcategory)
      && (filters.place === 'all' || item.place === filters.place)
      && (filters.media === 'all' || item.media?.some(media => media.type === filters.media))
      && words.every(word => haystack.includes(word))
  })
}

export function sortCatalog(items, sort = 'number') {
  return [...items].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ru') : sort === 'people' ? personNames[a.people].localeCompare(personNames[b.people], 'ru') || a.title.localeCompare(b.title, 'ru') : a.code.localeCompare(b.code, 'ru', { numeric: true }))
}

export function getCatalogPage(items, input) {
  const filtered = sortCatalog(filterCatalog(items, input), input.sort)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(pages, Math.max(1, Math.floor(Number(input.page)) || 1))
  return { all: filtered, items: filtered.slice((page - 1) * pageSize, page * pageSize), pages, page, total: filtered.length }
}

export function parseCatalogSearch(search, items = registryRecords) {
  const params = new URLSearchParams(search)
  const result = { ...defaultFilters, query: (params.get('q') ?? '').slice(0, 200).trim() }
  const options = { people: people.map(item => item.id), category: categories.map(item => item.id), status: Object.keys(statuses), place: [...new Set(items.map(item => item.place))], media: ['photo', 'video'], type: ['heritage', 'museum'], sort: ['number', 'title', 'people'], view: ['list', 'grid'] }
  for (const [key, values] of Object.entries(options)) {
    if (values.includes(params.get(key))) result[key] = params.get(key)
  }
  if (result.category !== 'all' && Object.hasOwn(subcategories[result.category], params.get('subcategory'))) result.subcategory = params.get('subcategory')
  const rawPage = params.get('page')
  if (/^[1-9]\d{0,5}$/.test(rawPage ?? '')) result.page = Number(rawPage)
  return { filters: result, record: params.get('record')?.slice(0, 100) || null }
}

export function catalogSearch(input = {}, record = null) {
  const filters = { ...defaultFilters, ...input }
  const params = new URLSearchParams()
  for (const key of Object.keys(defaultFilters)) {
    if (filters[key] !== defaultFilters[key] && filters[key] !== '' && filters[key] != null) params.set(key === 'query' ? 'q' : key, String(filters[key]))
  }
  if (record != null) params.set('record', String(record))
  return params.size ? `?${params}` : ''
}

export function catalogHref(filters = {}, record = null, base = '/Reestr3/') {
  return `${base.replace(/\/?$/, '/')}catalog/${catalogSearch(filters, record)}`
}

export function recordWord(count) {
  const last = count % 100
  return last >= 11 && last <= 14 ? 'записей' : count % 10 === 1 ? 'запись' : count % 10 >= 2 && count % 10 <= 4 ? 'записи' : 'записей'
}

export function paginationItems(current, total) {
  const pages = [...new Set([1, current - 1, current, current + 1, total].filter(page => page >= 1 && page <= total))].sort((a, b) => a - b)
  return pages.flatMap((page, index) => index && page - pages[index - 1] > 1 ? page - pages[index - 1] === 2 ? [page - 1, page] : [`gap-${page}`, page] : [page])
}

export function safeMediaUrl(value) {
  return typeof value === 'string' && /^(?:assets\/|media\/)[a-zA-Z0-9а-яА-ЯёЁ_./ -]+$/.test(value) && !value.split('/').includes('..') ? value : null
}

export function safeSourceUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}

export function catalogCsv(items) {
  const cell = value => {
    const text = String(value ?? '')
    const safe = /^[\s\u0000-\u001f\uFEFF]*[=+\-@]/u.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const rows = [['Идентификатор', 'Наименование', 'Раздел', 'Народ', 'Категория', 'Подкатегория', 'Территория', 'Сохранность', 'Редакционный статус'], ...items.map(item => [item.code, item.title, item.type === 'museum' ? 'Музейные предметы' : 'Нематериальное наследие', personNames[item.people], categoryNames[item.category], subcategories[item.category]?.[item.subcategory], item.place, statuses[item.status], item.editorialStatus === 'draft' ? 'Ожидает научной редакции' : 'Проверено'])]
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n')
}

export function validateCatalog(items) {
  if (!Array.isArray(items)) return ['Каталог должен быть массивом записей']
  const errors = [], ids = new Set(), codes = new Set()
  for (const item of items) {
    if (!item || typeof item !== 'object') { errors.push('Запись должна быть объектом'); continue }
    if (!/^[a-zA-Z0-9_-]+$/.test(String(item.id ?? ''))) errors.push(`Неверный ID: ${item.id}`)
    if (ids.has(String(item.id))) errors.push(`Повтор ID: ${item.id}`)
    if (codes.has(item.code)) errors.push(`Повтор кода: ${item.code}`)
    ids.add(String(item.id)); codes.add(item.code)
    if (['title', 'code', 'summary', 'place'].some(key => typeof item[key] !== 'string' || !item[key].trim()) || !Array.isArray(item.description) || !item.description.length || item.description.some(text => typeof text !== 'string' || !text.trim())) errors.push(`Не заполнен паспорт: ${item.id}`)
    if (!Object.hasOwn(personNames, item.people) || !Object.hasOwn(categoryNames, item.category) || !Object.hasOwn(subcategories[item.category] ?? {}, item.subcategory) || !Object.hasOwn(statuses, item.status)) errors.push(`Неизвестный классификатор: ${item.id}`)
    if (!['heritage', 'museum'].includes(item.type) || !['draft', 'reviewed'].includes(item.editorialStatus)) errors.push(`Неизвестный тип или редакционный статус: ${item.id}`)
    if (!Array.isArray(item.media) || item.media.some(media => !media || !['photo', 'video'].includes(media.type) || !safeMediaUrl(media.src) || !media.caption || !media.credit)) errors.push(`Неверные медиаданные: ${item.id}`)
    if (!Array.isArray(item.sources) || item.sources.some(source => !source?.title || !safeSourceUrl(source.url))) errors.push(`Неверный источник: ${item.id}`)
    if (!Array.isArray(item.related)) errors.push(`Не задан список связей: ${item.id}`)
  }
  for (const item of items) for (const id of Array.isArray(item?.related) ? item.related : []) {
    const related = items.find(record => record && String(record.id) === String(id))
    if (!related || related.type === item.type || !Array.isArray(related.related) || !related.related.some(value => String(value) === String(item.id))) errors.push(`Неверная или несимметричная связь: ${item.id} -> ${id}`)
  }
  return errors
}
