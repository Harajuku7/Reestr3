import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { catalogCsv, catalogHref, catalogSearch, categories, defaultFilters, filterCatalog, getCatalogPage, normalizeSearch, pageSize, paginationItems, parseCatalogSearch, people, recordWord, registryRecords, safeMediaUrl, safeSourceUrl, statuses, subcategories } from './catalog.mjs'
import './catalog.css'
import { catalogScrollTarget } from './catalog-navigation.mjs'

const baseUrl = import.meta.env.BASE_URL
const names = Object.fromEntries(people.map(person => [person.id, person.name]))
const categoryNames = Object.fromEntries(categories.map(category => [category.id, category.label]))
const isPlainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

function Field({ label, value, onChange, children, disabled }) {
  const id = useId()
  return <label className="registry-field" htmlFor={id}><span>{label}</span><select id={id} aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{children}</select></label>
}

function CatalogRecordLink({ item, filters, onOpen, className, children }) {
  return <a className={className} href={catalogHref(filters, item.id, baseUrl)} onClick={event => { if (isPlainClick(event)) { event.preventDefault(); onOpen(item.id) } }}>{children}</a>
}

function RecordList({ items, filters, onOpen }) {
  return <div className={`registry-results is-${filters.view}`}>
    {filters.view === 'list' && <div className="registry-column-head" aria-hidden="true"><span>Код</span><span>Объект и категория</span><span>{filters.type === 'museum' ? 'Народ / место съёмки' : 'Народ / территория'}</span><span>Сохранность</span><span /></div>}
    {items.map(item => <article className="registry-result" key={item.id}>
      <span className="registry-code">{item.code}</span>
      <div className="registry-result-copy">{item.media.some(media => media.type === 'photo') && <img className="registry-thumbnail" src={`${baseUrl}${item.media.find(media => media.type === 'photo').src}`} alt={item.title} loading="lazy" width="1254" height="1254"/>}<p className="registry-result-category">{categoryNames[item.category]}</p><h2><CatalogRecordLink item={item} filters={filters} onOpen={onOpen}>{item.title}</CatalogRecordLink></h2><p className="registry-result-summary">{item.summary}</p>{!!item.media.length && <span className="registry-media-count"><Icon name="photo" size={14}/>{item.media.filter(media => media.type === 'photo').length} фото</span>}</div>
      <div className="registry-location"><strong>{names[item.people]}</strong><span>{item.place}</span></div>
      <span className={`registry-status registry-status--${item.status}`}>{statuses[item.status]}</span>
      <CatalogRecordLink className="registry-open" item={item} filters={filters} onOpen={onOpen}><span className="sr-only">Открыть запись «{item.title}»</span><Icon name="arrow" /></CatalogRecordLink>
    </article>)}
  </div>
}

function Pagination({ page, pages, onChange }) {
  if (pages < 2) return null
  return <nav className="registry-pagination" aria-label="Страницы результатов">
    <button type="button" aria-label="Предыдущая страница" disabled={page === 1} onClick={() => onChange(page - 1)}><Icon name="back" size={17}/></button>
    {paginationItems(page, pages).map(value => typeof value === 'number'
      ? <button key={value} type="button" aria-label={`Страница ${value}`} aria-current={value === page ? 'page' : undefined} onClick={() => onChange(value)}>{value}</button>
      : <span className="registry-pagination-gap" key={value} aria-hidden="true">…</span>)}
    <button type="button" aria-label="Следующая страница" disabled={page === pages} onClick={() => onChange(page + 1)}><Icon name="arrow" size={17}/></button>
  </nav>
}

function RecordMedia({ media, featured = false }) {
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [selected, setSelected] = useState(null)
  const [failed, setFailed] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const photos = media.filter(item => item.type === 'photo' && safeMediaUrl(item.src))
  const videos = media.filter(item => item.type === 'video' && safeMediaUrl(item.src))
  const activePhoto = photos[activeIndex]
  const enlarge = (event, photo) => { trigger.current = event.currentTarget; setSelected(photo) }
  useEffect(() => { if (selected) dialog.current?.showModal() }, [selected])
  return <section className={`passport-section${featured ? ' passport-featured-media' : ''}`} id="record-media" tabIndex={-1}><h2 className={featured ? 'sr-only' : undefined}>Фотографии и видео</h2>
    {!photos.length && !videos.length && <div className="media-awaiting"><Icon name="photo" size={28}/><div><strong>Медиаматериалы готовятся</strong><p>Здесь будут фотографии объекта с разных ракурсов, записи исполнения или процесса изготовления. Иллюстрации других объектов не подставляются.</p></div></div>}
    {!!photos.length && (featured ? <>
      <figure className="passport-main-photo">
        {failed.includes(activePhoto.src) ? <div className="passport-photo-error" role="status">Изображение не загрузилось. Выберите другой ракурс или обновите страницу.</div> : <button type="button" aria-label={`Увеличить фотографию ${activeIndex + 1}: ${activePhoto.caption}`} onClick={event => enlarge(event, activePhoto)}><img src={`${baseUrl}${activePhoto.src}`} alt={activePhoto.caption} width="1254" height="1254" onError={() => setFailed(value => [...value, activePhoto.src])}/><span className="passport-enlarge"><Icon name="search" size={16}/>Увеличить</span></button>}
        <figcaption aria-live="polite"><span>{activeIndex + 1} / {photos.length}</span>{activePhoto.caption}</figcaption>
      </figure>
      {photos.length > 1 && <div className="passport-thumbnails" aria-label="Ракурсы предмета">{photos.map((photo, index) => <button type="button" key={photo.src} aria-label={`Ракурс ${index + 1}: ${photo.caption}`} aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)}><img src={`${baseUrl}${photo.src}`} alt="" loading="lazy" width="1254" height="1254"/><span>{index + 1}</span></button>)}</div>}
      <p className="passport-photo-credit">{activePhoto.credit}</p>
    </> : <div className="passport-gallery">{photos.map((photo, index) => <figure key={photo.src}>{failed.includes(photo.src) ? <p>Изображение не загрузилось. Попробуйте обновить страницу.</p> : <button type="button" aria-label={`Увеличить фотографию ${index + 1}: ${photo.caption}`} onClick={event => enlarge(event, photo)}><img src={`${baseUrl}${photo.src}`} alt={photo.caption} loading="lazy" onError={() => setFailed(value => [...value, photo.src])}/></button>}<figcaption>{photo.caption}<small>{photo.credit}</small></figcaption></figure>)}</div>)}
    {videos.map(video => <figure className="passport-video" key={video.src}><video controls preload="none" src={`${baseUrl}${video.src}`} aria-label={video.caption}/><figcaption>{video.caption}<small>{video.credit}</small></figcaption></figure>)}
    <dialog className="registry-lightbox" aria-label="Просмотр фотографии" ref={dialog} onClose={() => { setSelected(null); trigger.current?.focus() }}><form method="dialog"><button className="icon-button" aria-label="Закрыть фотографию"><Icon name="close"/></button></form>{selected && <figure><img src={`${baseUrl}${selected.src}`} alt={selected.caption}/><figcaption>{selected.caption}<small>{selected.credit}</small></figcaption></figure>}</dialog>
  </section>
}

function Passport({ item, filters, onOpen, onBack, announce }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => setCopied(false), [item.id])
  const related = registryRecords.filter(record => item.related.some(id => String(id) === String(record.id)))
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); announce('Ссылка на запись скопирована') }
    catch { announce('Не удалось скопировать ссылку. Выделите и скопируйте адрес страницы из адресной строки браузера.') }
  }
  const facts = [
    ['Идентификатор каталога', item.code], ['Народ', names[item.people]], ['Категория', categoryNames[item.category]],
    ['Подкатегория', subcategories[item.category][item.subcategory]], [item.type === 'museum' ? 'Место съёмки' : 'Территория', item.place],
    [item.type === 'museum' ? 'Состояние предмета' : 'Степень сохранности', statuses[item.status]],
    ...(item.type === 'museum' ? [['Музей / собрание', item.museum || 'Не указано'], ['Инвентарный номер', item.inventoryNumber || 'Не указан'], ['Материалы и техника', item.materials || 'Уточняются'], ['Размеры', item.dimensions || 'Не указаны'], ['Датировка', item.dating || 'Не установлена']] : []),
  ]
  const museum = item.type === 'museum'
  const header = <header className="passport-header"><p className="kicker">{museum ? 'Музейный предмет' : 'Объект нематериального наследия'} / {item.code}</p><h1 id="registry-view-title" tabIndex={-1}>{item.title}</h1><p className="passport-summary">{item.summary}</p>{item.editorialStatus === 'draft' && <span className="registry-draft">Ожидает научной редакции</span>}</header>
  const factPanel = <aside className="passport-facts" id="record-facts" tabIndex={-1} aria-label="Паспортные сведения"><h2>Паспортные сведения</h2><dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="passport-code-note">Код служит для навигации внутри каталога и не является номером государственного реестра.</p></aside>
  return <article className={`registry-passport${museum ? ' registry-passport--museum' : ''}`}>
    <div className="passport-topline"><a className="registry-back" href={`${catalogHref(filters, null, baseUrl)}#results-heading`} onClick={event => { if (isPlainClick(event)) { event.preventDefault(); onBack() } }}><Icon name="back" size={18}/>К результатам поиска</a><button className="text-button" onClick={share}><Icon name={copied ? 'check' : 'link'} size={18}/>{copied ? 'Ссылка скопирована' : 'Ссылка на запись'}</button></div>
    {museum ? <div className="museum-overview">{header}<RecordMedia key={String(item.id)} media={item.media} featured/><div className="museum-overview-copy"><dl className="museum-key-facts"><div><dt>Народ</dt><dd>{names[item.people]}{item.editorialStatus === 'draft' && <span> (атрибуция уточняется)</span>}</dd></div><div><dt>Музей / собрание</dt><dd>{item.museum || 'Не указано'}</dd></div></dl></div></div> : header}
    <nav className="passport-sections" aria-label="Разделы паспорта"><a href="#record-description">Описание</a><a href="#record-media">{museum ? 'Фотографии' : 'Медиаматериалы'}</a><a href="#record-facts">Паспортные сведения</a><a href="#record-related">{museum ? 'Традиции' : 'Предметы'}</a><a href="#record-sources">Источники</a></nav>
    <div className="passport-layout">{!museum && factPanel}
      <div className="passport-body">
        <section className="passport-section" id="record-description" tabIndex={-1}><h2>Описание</h2>{item.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{item.transmission && <><h3>Передача традиции</h3><p>{item.transmission}</p></>}</section>
        {item.type !== 'museum' && <RecordMedia key={String(item.id)} media={item.media}/>}
        <section className="passport-section" id="record-related" tabIndex={-1}><div className="passport-section-title"><h2>{item.type === 'museum' ? 'Связанные традиции' : 'Связанные предметы'}</h2><span>{related.length}</span></div>{related.length ? <div className="passport-related">{related.map(record => <CatalogRecordLink className="passport-related-link" key={record.id} item={record} filters={filters} onOpen={onOpen}><span className="registry-code">{record.code}</span><span><strong>{record.title}</strong><small>{record.summary}</small></span><Icon name="arrow"/></CatalogRecordLink>)}</div> : <p className="registry-muted">Связи будут добавлены после сверки предметов и описаний. Отсутствие связанной карточки не означает отсутствия предметного контекста.</p>}</section>
        <section className="passport-section" id="record-sources" tabIndex={-1}><h2>Источники и документирование</h2>{item.sources.length ? <ol className="passport-sources">{item.sources.filter(source => safeSourceUrl(source.url)).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span className="sr-only"> (откроется в новой вкладке)</span></a>{source.note && <p>{source.note}</p>}</li>)}</ol> : <p className="registry-muted">Полевые записи, музейные документы и библиографические ссылки будут внесены исследовательской группой. Текущее описание является временным редакционным текстом.</p>}</section>
      </div>
      {museum && factPanel}
    </div>
  </article>
}

export default function CatalogPage() {
  const [location, setLocation] = useState(() => parseCatalogSearch(window.location.search))
  const { filters, record } = location
  const [announcement, setAnnouncement] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pendingScroll = useRef(window.location.hash ? catalogScrollTarget(window.location.hash) : null)
  const result = useMemo(() => getCatalogPage(registryRecords, filters), [filters])
  const item = record == null ? null : registryRecords.find(value => String(value.id) === record)
  const places = [...new Set(registryRecords.filter(item => item.type === filters.type).map(item => item.place))].sort((a, b) => a.localeCompare(b, 'ru'))

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const onPop = () => { pendingScroll.current = catalogScrollTarget(window.location.hash, window.history.state?.registryScroll); setLocation(parseCatalogSearch(window.location.search)); setSuggestionsOpen(false) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    // Back может произойти, пока загружается JS после обновления страницы.
    // Сверяем URL ещё раз после подключения подписки, не сохраняя старый паспорт.
    setLocation(parseCatalogSearch(window.location.search))
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); window.history.scrollRestoration = previousScrollRestoration }
  }, [])

  useLayoutEffect(() => {
    const target = pendingScroll.current
    pendingScroll.current = null
    if (!target) return
    const element = target.id && document.getElementById(target.id)
    if (element) { element.focus({ preventScroll: true }); element.scrollIntoView({ block: 'start', behavior: 'instant' }) }
    else if ('top' in target) window.scrollTo({ top: target.top, behavior: 'instant' })
  }, [location])

  const navigate = (nextFilters, nextRecord, { replace = false, scroll = false } = {}) => {
    const url = `${window.location.pathname}${catalogSearch(nextFilters, nextRecord)}`
    window.history.replaceState({ ...window.history.state, registryScroll: window.scrollY }, '', window.location.href)
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== url) window.history[replace ? 'replaceState' : 'pushState']({ registryScroll: scroll ? 0 : window.scrollY }, '', url)
    setLocation({ filters: nextFilters, record: nextRecord == null ? null : String(nextRecord) })
    if (scroll) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  }
  const change = (patch, replace = false) => {
    const next = { ...filters, ...patch, page: Object.hasOwn(patch, 'page') ? patch.page : 1 }
    if (Object.hasOwn(patch, 'category')) next.subcategory = 'all'
    navigate(next, null, { replace })
  }
  const reset = () => { navigate({ ...defaultFilters, type: filters.type, view: filters.view }, null); setSuggestionsOpen(false) }
  const open = id => { setSuggestionsOpen(false); navigate({ ...filters, page: result.page }, id, { scroll: true }) }
  const focusResults = () => requestAnimationFrame(() => { const heading = document.getElementById('results-heading'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'instant' }) })
  const backToResults = () => { navigate(filters, null); focusResults() }

  useEffect(() => {
    document.title = record ? `${item?.title ?? 'Запись не найдена'} - Наследие Кузбасса` : 'Каталог наследия - Наследие Кузбасса'
    const target = catalogScrollTarget(window.location.hash)
    const heading = 'id' in target ? document.getElementById(target.id) : document.getElementById('registry-view-title')
    heading?.focus({ preventScroll: true })
  }, [record, item?.title])

  useEffect(() => {
    if (!record && result.page !== filters.page) {
      const next = { ...filters, page: result.page }
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${catalogSearch(next)}`)
      setLocation({ filters: next, record: null })
    }
  }, [record, result.page, filters])

  const categoryCounts = Object.fromEntries(categories.map(category => [category.id, filterCatalog(registryRecords, { ...filters, category: category.id, subcategory: 'all' }).length]))
  const peopleCounts = Object.fromEntries(['all', ...people.map(person => person.id)].map(id => [id, filterCatalog(registryRecords, { ...filters, people: id }).length]))
  const suggestions = filters.query.trim() ? registryRecords.filter(value => value.type === filters.type && normalizeSearch(value.title).includes(normalizeSearch(filters.query))).slice(0, 4) : []
  const chips = [
    ['query', filters.query ? `Поиск: ${filters.query}` : null], ['people', names[filters.people]], ['category', categoryNames[filters.category]],
    ['subcategory', subcategories[filters.category]?.[filters.subcategory]], ['status', statuses[filters.status]],
    ['place', filters.place !== 'all' ? filters.place : null], ['media', filters.media === 'photo' ? 'С фотографиями' : filters.media === 'video' ? 'С видео' : null],
  ].filter(([, label]) => label)

  const download = () => {
    const url = URL.createObjectURL(new Blob([catalogCsv(result.all)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'nasledie-kuzbassa.csv'; document.body.append(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setAnnouncement(`Подготовлена выгрузка: ${result.total} ${recordWord(result.total)}. Файл содержит все результаты текущей подборки, а не только страницу.`)
  }

  return <div className="registry-page">
    <nav className="registry-breadcrumbs" aria-label="Хлебные крошки"><a href={`${baseUrl}#top`}>Главная</a><span aria-hidden="true">/</span>{record ? <><a href={catalogHref(filters, null, baseUrl)} onClick={event => { if (isPlainClick(event)) { event.preventDefault(); backToResults() } }}>Каталог</a><span aria-hidden="true">/</span><span>{item?.code ?? 'Запись'}</span></> : <span aria-current="page">Каталог</span>}</nav>
    {record ? item ? <Passport item={item} filters={filters} onOpen={open} onBack={backToResults} announce={setAnnouncement}/> : <section className="registry-not-found"><p className="kicker">Каталог наследия</p><h1 id="registry-view-title" tabIndex={-1}>Запись не найдена</h1><p>Возможно, ссылка устарела или в идентификаторе есть ошибка. Остальные записи доступны в каталоге.</p><a className="primary-button" href={catalogHref(filters, null, baseUrl)} onClick={event => { if (isPlainClick(event)) { event.preventDefault(); backToResults() } }}>Вернуться к каталогу<Icon name="arrow"/></a></section> : <>
      <header className="registry-heading"><div><h1 id="registry-view-title" tabIndex={-1}>Каталог наследия</h1><p>Традиции и музейные предметы шорцев и телеутов.</p></div></header>
      <nav className="registry-sections" aria-label="Разделы каталога">{[['heritage', 'Нематериальное наследие'], ['museum', 'Музейные предметы']].map(([value, label]) => <a key={value} href={catalogHref({ ...defaultFilters, type: value }, null, baseUrl)} aria-current={filters.type === value ? 'page' : undefined} onClick={event => { if (isPlainClick(event)) { event.preventDefault(); navigate({ ...defaultFilters, type: value, view: filters.view }, null); setSuggestionsOpen(false) } }}>{label}<span>{registryRecords.filter(item => item.type === value).length}</span></a>)}</nav>
      <section className="registry-discovery" aria-label="Поиск в каталоге"><form className="registry-search" role="search" onSubmit={event => { event.preventDefault(); setSuggestionsOpen(false); focusResults() }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSuggestionsOpen(false) }}>
        <label className="sr-only" htmlFor="catalog-query">Поиск по названию, описанию, народу или территории</label><div className="search-field"><Icon name="search" size={21}/><input id="catalog-query" type="search" maxLength={200} autoComplete="off" value={filters.query} placeholder="Название или место" onFocus={() => setSuggestionsOpen(true)} onChange={event => { change({ query: event.target.value }, true); setSuggestionsOpen(true) }} onKeyDown={event => { if (event.key === 'Escape') setSuggestionsOpen(false) }}/><button type="submit">Найти</button></div>
        {suggestionsOpen && !!suggestions.length && <div className="registry-suggestions" aria-label="Подсказки поиска"><p>Подходящие названия</p>{suggestions.map(item => <button key={item.id} type="button" onClick={() => { change({ query: item.title }); setSuggestionsOpen(false); focusResults() }}><Icon name="search" size={16}/>{item.title}<span>{names[item.people]}</span></button>)}</div>}
      </form><div className="registry-discovery-actions"><div className="registry-people" aria-label="Фильтр по народу">{[['all', 'Все народы'], ...people.map(person => [person.id, person.name])].map(([value, label]) => <button type="button" key={value} aria-pressed={filters.people === value} onClick={() => change({ people: value })}>{label}<span>{peopleCounts[value]}</span></button>)}</div><button className="registry-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="registry-filter-fields" onClick={() => setFiltersOpen(value => !value)}><Icon name="filter" size={18}/><span>Фильтры</span>{chips.some(([key]) => !['query', 'people'].includes(key)) && <span className="registry-filter-count">{chips.filter(([key]) => !['query', 'people'].includes(key)).length}</span>}<Icon name="chevron" size={16}/></button></div></section>
      <div className="registry-workspace"><aside className="registry-filters" id="registry-filter-fields" hidden={!filtersOpen} aria-label="Дополнительные фильтры"><div className="registry-filter-panel">
        <h2>Категории</h2><div className="registry-category-filter"><button type="button" aria-pressed={filters.category === 'all'} onClick={() => change({ category: 'all' })}><span>Все категории</span><span>{filterCatalog(registryRecords, { ...filters, category: 'all', subcategory: 'all' }).length}</span></button>{categories.map(category => <button key={category.id} type="button" aria-pressed={filters.category === category.id} onClick={() => change({ category: category.id })}><span>{category.label}</span><span>{categoryCounts[category.id]}</span></button>)}</div>
        <div className="registry-extra-filters"><Field label="Подкатегория" value={filters.subcategory} onChange={value => change({ subcategory: value })} disabled={filters.category === 'all'}><option value="all">{filters.category === 'all' ? 'Сначала выберите категорию' : 'Все подкатегории'}</option>{Object.entries(subcategories[filters.category] ?? {}).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Field><Field label="Территория" value={filters.place} onChange={value => change({ place: value })}><option value="all">Все территории</option>{places.map(place => <option value={place} key={place}>{place}</option>)}</Field><Field label="Степень сохранности" value={filters.status} onChange={value => change({ status: value })}><option value="all">Все состояния</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Field><Field label="Медиаматериалы" value={filters.media} onChange={value => change({ media: value })}><option value="all">Все записи</option><option value="photo">С фотографиями</option><option value="video">С видеозаписями</option></Field><button className="text-button" type="button" onClick={reset}><Icon name="reset" size={17}/>Сбросить фильтры</button></div>
      </div><button className="registry-apply-filters" type="button" onClick={() => { setFiltersOpen(false); focusResults() }}>Показать {result.total} {recordWord(result.total)}<Icon name="arrow" size={18}/></button></aside><section className="registry-list-area" aria-labelledby="results-heading"><div className="registry-results-toolbar"><h2 id="results-heading" tabIndex={-1} aria-live="polite" aria-atomic="true">{result.total} {recordWord(result.total)}</h2><div className="registry-sort-view"><Field label="Сортировка" value={filters.sort} onChange={value => change({ sort: value })}><option value="number">По идентификатору</option><option value="title">По названию: А-Я</option><option value="people">По народу</option></Field><div className="registry-view-switch" aria-label="Вид результатов">{[['list', 'Список'], ['grid', 'Карточки']].map(([value, label]) => <button key={value} type="button" aria-label={label} aria-pressed={filters.view === value} onClick={() => navigate({ ...filters, view: value }, null, { replace: true })}><Icon name={value}/></button>)}</div></div></div>
        {!!chips.length && <div className="registry-active-filters" aria-label="Применённые фильтры">{chips.map(([key, label]) => <button key={key} type="button" aria-label={`Убрать фильтр: ${label}`} onClick={() => change({ [key]: defaultFilters[key] })}><span>{label}</span><Icon name="close" size={14}/></button>)}<button type="button" className="registry-clear-all" onClick={reset}>Очистить все</button></div>}
        {result.total ? <>
          <RecordList items={result.items} filters={{ ...filters, page: result.page }} onOpen={open}/>
          <div className="registry-bottom">
            <p>Показаны {(result.page - 1) * pageSize + 1}-{Math.min(result.page * pageSize, result.total)} из {result.total}</p>
            <Pagination page={result.page} pages={result.pages} onChange={page => { change({ page }); focusResults() }}/>
          </div>
        </> : <div className="registry-empty"><Icon name="search" size={32}/><h3>Записей не найдено</h3><p>Попробуйте другое слово или уберите часть условий. Фотографии доступны в разделе музейных предметов; видеозаписи будут добавлены позже.</p><button className="primary-button compact" type="button" onClick={reset}>Показать все записи<Icon name="arrow" size={18}/></button></div>}
        <div className="registry-export"><button type="button" className="text-button" disabled={!result.total} onClick={download}><Icon name="download" size={17}/>Скачать подборку CSV</button><span>Все результаты с учётом выбранных фильтров</span></div>
      </section></div>
    </>}
    <p className="registry-action-status" role="status" aria-live="polite">{announcement}</p>
  </div>
}
