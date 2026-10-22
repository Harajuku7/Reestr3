import test from "node:test"
import assert from "node:assert/strict"
import { catalogCsv, catalogHref, catalogItems, catalogSearch, categories, defaultFilters, filterCatalog, getCatalogPage, normalizeSearch, paginationItems, parseCatalogSearch, people, recordWord, registryRecords, safeMediaUrl, safeSourceUrl, sortCatalog, validateCatalog } from "./catalog.mjs"
import { existsSync, statSync } from 'node:fs'

const base = { people: "all", category: "all", status: "all", query: "" }

test("фильтрует записи по народу", () => {
  const result = filterCatalog(catalogItems, { ...base, people: "teleut" })
  assert.ok(result.length > 0)
  assert.ok(result.every((item) => item.people === "teleut"))
})

test("совмещает категорию и статус", () => {
  // Сохранность реальных черновых карточек не придумана ради демонстрации фильтра.
  const fixture = catalogItems.map(item => ({ ...item, status: item.id === 2 ? 'preserved' : 'partial' }))
  const result = filterCatalog(fixture, { ...base, category: "production", status: "preserved" })
  assert.deepEqual(result.map((item) => item.title), ["Ткачество традиционного пояса"])
})

test("ищет без учета регистра", () => {
  const result = filterCatalog(catalogItems, { ...base, query: "КЕДРОВОГО" })
  assert.equal(result.length, 1)
})

test("возвращает пустой список для неизвестного запроса", () => {
  const result = filterCatalog(catalogItems, { ...base, query: "несуществующий объект" })
  assert.deepEqual(result, [])
})

test("каждая запись связана с категорией классификации", () => {
  const categoryIds = new Set(categories.map((category) => category.id))
  assert.ok(catalogItems.every((item) => categoryIds.has(item.category)))
})

test("каталог содержит только шорцев и телеутов", () => {
  assert.deepEqual(people.map((item) => item.id), ["shor", "teleut"])
  assert.ok(catalogItems.every((item) => item.people === "shor" || item.people === "teleut"))
})

test('модель всех записей и двусторонние связи проходят проверку', () => assert.deepEqual(validateCatalog(registryRecords), []))
test('новые записи не выдают временную оценку за научную', () => {
  assert.ok(registryRecords.every(item => item.editorialStatus === 'draft' && item.status === 'unknown'))
  assert.ok(registryRecords.filter(item => item.type === 'museum').every(item => item.inventoryNumber === null))
})
test('все 7 фотографий существуют, два предмета не раздроблены по ракурсам', () => {
  const objects = registryRecords.filter(item => item.type === 'museum')
  assert.deepEqual(objects.map(item => item.media.length), [4, 3])
  for (const item of objects) for (const media of item.media) {
    const path = new URL(`../public/${media.src}`, import.meta.url)
    assert.ok(existsSync(path)); assert.ok(statSync(path).size > 1000)
  }
})
test('ищет ё/е, разные регистры и несколько слов одновременно', () => {
  assert.equal(normalizeSearch('  РЕМЁСЛА, КУЗБАСС! '), 'ремесла кузбасс')
  const result = filterCatalog(catalogItems, { query: 'ШОРЦЫ кедрового' })
  assert.deepEqual(result.map(item => item.id), [4])
  assert.ok(filterCatalog(catalogItems, { query: 'ремесла' }).length > 0)
})
test('ищет по коду, описанию и территории', () => {
  assert.deepEqual(filterCatalog(catalogItems, { query: 'КН-0007' }).map(item => item.id), [7])
  assert.ok(filterCatalog(catalogItems, { query: 'локальные' }).length > 0)
  assert.ok(filterCatalog(catalogItems, { query: 'Беловский' }).every(item => item.place === 'Беловский округ'))
})
test('раздел предметов, фото, территория и подкатегория совмещаются', () => {
  const result = filterCatalog(registryRecords, { type: 'museum', people: 'shor', category: 'rituals', subcategory: 'occasional', place: 'Гурьевск', media: 'photo' })
  assert.deepEqual(result.map(item => item.id), ['shor-drum-guryevsk'])
  assert.deepEqual(filterCatalog(registryRecords, { type: 'museum', media: 'video' }), [])
})
test('сортировка не меняет исходный массив', () => {
  const before = [...catalogItems]
  const sorted = sortCatalog(catalogItems, 'title')
  assert.deepEqual(catalogItems, before)
  assert.ok(sorted.every((item, index) => !index || sorted[index - 1].title.localeCompare(item.title, 'ru') <= 0))
})
test('пагинация не теряет и не дублирует записи, ограничивает неизвестную страницу', () => {
  const result = getCatalogPage(catalogItems, { ...defaultFilters, page: 999 })
  assert.equal(result.page, result.pages)
  const all = Array.from({ length: result.pages }, (_, index) => getCatalogPage(catalogItems, { ...defaultFilters, page: index + 1 }).items).flat()
  assert.deepEqual(all.map(item => item.id), catalogItems.map(item => item.id))
  assert.equal(getCatalogPage([], defaultFilters).page, 1)
  assert.deepEqual(getCatalogPage([], defaultFilters).items, [])
})
test('пагинация остаётся компактной при большом числе страниц', () => {
  assert.deepEqual(paginationItems(1, 3), [1, 2, 3])
  assert.ok(paginationItems(2500, 5000).length <= 9)
  assert.equal(paginationItems(2500, 5000).at(-1), 5000)
})
test('URL сохраняет все фильтры и запись, работает из подпути Pages', () => {
  const input = { ...defaultFilters, query: 'бубен & дерево', people: 'shor', category: 'rituals', subcategory: 'occasional', status: 'unknown', place: 'Гурьевск', media: 'photo', type: 'museum', sort: 'title', view: 'grid', page: 3 }
  const search = catalogSearch(input, 'shor-drum-guryevsk')
  assert.deepEqual(parseCatalogSearch(search), { filters: input, record: 'shor-drum-guryevsk' })
  assert.ok(catalogHref(input, 'shor-drum-guryevsk').startsWith('/Reestr3/catalog/?'))
  assert.equal(catalogHref(), '/Reestr3/catalog/')
  assert.equal(catalogHref({}, null, '/'), '/catalog/')
})
test('неверные URL-параметры нормализуются без падения', () => {
  const parsed = parseCatalogSearch('?people=russian&category=__proto__&subcategory=constructor&status=wrong&view=unknown&page=Infinity&type=other')
  assert.deepEqual(parsed.filters, defaultFilters)
  assert.equal(parseCatalogSearch('?category=games&subcategory=occasional').filters.subcategory, 'all')
  assert.equal(parseCatalogSearch('?q=' + 'a'.repeat(1000)).filters.query.length, 200)
})
test('склонения числительных корректны', () => {
  for (const [count, word] of [[0,'записей'],[1,'запись'],[2,'записи'],[5,'записей'],[11,'записей'],[21,'запись'],[22,'записи'],[111,'записей']]) assert.equal(recordWord(count), word)
})
test('экспорт включает все результаты, кириллицу, кавычки и защиту формул', () => {
  const csv = catalogCsv(catalogItems)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.equal(csv.split('\r\n').length, catalogItems.length + 1)
  const malicious = [{ ...catalogItems[0], title: '\t=1+1', summary: 'кавычка "' }]
  assert.ok(catalogCsv(malicious).includes("'\t=1+1"))
  assert.ok(catalogCsv([{ ...catalogItems[0], title: 'Название "цитата"' }]).includes('""цитата""'))
})
test('медиа не допускают удалённые URL, обход директорий и script', () => {
  assert.equal(safeMediaUrl('assets/objects/a.jpg'), 'assets/objects/a.jpg')
  for (const url of ['https://other.test/a.jpg', '//other.test/a.jpg', 'assets/../a.jpg', 'javascript:alert(1)', 'assets/a.jpg?token=x']) assert.equal(safeMediaUrl(url), null)
  assert.equal(safeSourceUrl('javascript:alert(1)'), null)
  assert.equal(safeSourceUrl('https://user:password@example.com/'), null)
})
test('валидатор ловит дубли, нарушенные связи и опасные медиа', () => {
  assert.ok(validateCatalog([registryRecords[0], registryRecords[0]]).some(error => error.includes('Повтор')))
  assert.ok(validateCatalog([{ ...registryRecords[0], related: ['missing'] }]).some(error => error.includes('связь')))
  assert.ok(validateCatalog([{ ...registryRecords[0], media: [{ type: 'photo', src: 'javascript:a', caption: 'A', credit: 'B' }] }]).some(error => error.includes('медиаданные')))
  assert.ok(validateCatalog([null]).length > 0)
  assert.ok(validateCatalog(null).length > 0)
  assert.ok(validateCatalog([{ ...registryRecords[0], people: 'constructor' }]).some(error => error.includes('классификатор')))
  assert.ok(validateCatalog([{ ...registryRecords[0], title: { unexpected: true } }]).some(error => error.includes('паспорт')))
  assert.ok(validateCatalog([{ ...registryRecords[0], related: 'wrong' }]).length > 0)
})
