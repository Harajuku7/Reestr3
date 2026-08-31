import { useMemo, useState } from "react"
import { catalogItems, categories, filterCatalog, people, statuses } from "./catalog.mjs"

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    marker: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const initialFilters = { people: "all", category: "all", status: "all", query: "" }
const baseUrl = import.meta.env.BASE_URL

export default function App() {
  const [navOpen, setNavOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [fontSize, setFontSize] = useState("normal")
  const [contrast, setContrast] = useState(false)
  const [spacing, setSpacing] = useState(false)
  const [activePeople, setActivePeople] = useState("shor")
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [announcement, setAnnouncement] = useState("")

  const suggestions = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("ru")
    const defaults = ["Обряды", "Ремесла", "Шорцы", "Телеуты"]
    if (!value) return defaults.slice(0, 4)
    const pool = [...catalogItems.map((item) => item.title), ...defaults]
    return pool.filter((item) => item.toLocaleLowerCase("ru").includes(value)).slice(0, 5)
  }, [query])

  const filteredItems = useMemo(() => filterCatalog(catalogItems, filters), [filters])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const choosePeople = (id, move = true) => {
    setActivePeople(id)
    setAnnouncement(`На карте выбран раздел «${people.find((item) => item.id === id)?.name}»`)
    if (move) window.setTimeout(() => scrollTo(`people-${id}`), 80)
  }

  const openCatalog = (next = {}) => {
    setFilters((current) => ({ ...current, ...next }))
    setSearchOpen(false)
    window.setTimeout(() => scrollTo("catalog"), 60)
  }

  const submitSearch = (event) => {
    event.preventDefault()
    openCatalog({ query })
  }

  const resetAccessibility = () => {
    setFontSize("normal")
    setContrast(false)
    setSpacing(false)
  }

  return (
    <div className={`site font-${fontSize}${contrast ? " high-contrast" : ""}${spacing ? " spaced" : ""}`}>
      <a className="skip-link" href="#main">Перейти к основному содержанию</a>
      <div className="prototype-bar">Прототип научно-просветительского каталога</div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="На главную страницу каталога">
          <img src={`${baseUrl}assets/kuzbass-coat-of-arms.png`} width="50" height="58" alt="Герб Кемеровской области - Кузбасса" />
          <span><b>Наследие Кузбасса</b><small>электронный каталог</small></span>
        </a>
        <nav className={`main-nav${navOpen ? " is-open" : ""}`} aria-label="Основная навигация">
          <a href="#top" onClick={() => setNavOpen(false)}>Главная</a>
          {people.map((item) => <a key={item.id} href={`#people-${item.id}`} onClick={() => { setActivePeople(item.id); setNavOpen(false) }}>{item.name}</a>)}
          <a href="#catalog" onClick={() => setNavOpen(false)}>Каталог</a>
          <a href="#about" onClick={() => setNavOpen(false)}>О проекте</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button access-trigger" type="button" aria-label="Версия для слабовидящих" aria-expanded={accessOpen} aria-controls="access-panel" onClick={() => setAccessOpen((value) => !value)}>
            <Icon name="eye" /><span>Версия для слабовидящих</span>
          </button>
          <button className="icon-button menu-button" type="button" aria-label={navOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={navOpen} onClick={() => setNavOpen((value) => !value)}>
            <Icon name={navOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>

      {accessOpen && (
        <section className="access-panel" id="access-panel" aria-label="Настройки доступности">
          <div className="access-group"><span>Размер текста</span><div className="segmented" aria-label="Размер текста">
            {[['normal', 'А'], ['large', 'А+'], ['xlarge', 'А++']].map(([value, label]) => <button key={value} type="button" className={fontSize === value ? "active" : ""} aria-pressed={fontSize === value} onClick={() => setFontSize(value)}>{label}</button>)}
          </div></div>
          <label className="switch"><input type="checkbox" checked={contrast} onChange={(event) => setContrast(event.target.checked)} /><span>Высокий контраст</span></label>
          <label className="switch"><input type="checkbox" checked={spacing} onChange={(event) => setSpacing(event.target.checked)} /><span>Увеличить интервалы</span></label>
          <button className="text-button" type="button" onClick={resetAccessibility}><Icon name="reset" size={17} />Сбросить</button>
        </section>
      )}

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="kicker">Кемеровская область - Кузбасс</p>
            <h1>Каталог нематериального этнокультурного наследия коренных малочисленных народов Кузбасса</h1>
            <p className="hero-lead">Живые традиции, обряды, ремесла и знания шорцев и телеутов в едином научно-просветительском пространстве.</p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={() => openCatalog()}><span>Открыть каталог</span><Icon name="arrow" /></button>
              <a className="quiet-link" href="#map-description">Как устроена карта</a>
            </div>
          </div>

          <div className="map-stage" aria-labelledby="map-title">
            <div className="map-heading">
              <div><p className="kicker">Карта расселения</p><h2 id="map-title">Народы Кузбасса</h2></div>
              <p>Выберите народ на карте</p>
            </div>
            <div className="map-canvas" data-active={activePeople}>
              <img src={`${baseUrl}assets/kemerovo-outline-raster.png`} width="713" height="1023" alt="Контурная карта Кемеровской области с муниципальными границами" />
              <button className="map-marker map-marker--teleut" type="button" aria-pressed={activePeople === "teleut"} onClick={() => choosePeople("teleut")}><span className="marker-index">02</span><span>Телеуты<small>Бачатские земли</small></span></button>
              <button className="map-marker map-marker--shor" type="button" aria-pressed={activePeople === "shor"} onClick={() => choosePeople("shor")}><span className="marker-index">01</span><span>Шорцы<small>Горная Шория</small></span></button>
              <div className="map-note">Схема ареалов предварительная и будет уточнена научным коллективом</div>
            </div>
            <div className="map-legend" aria-label="Условные обозначения">
              <span><i className="legend-mark shor" />Шорцы</span><span><i className="legend-mark teleut" />Телеуты</span>
            </div>
          </div>
        </section>

        <section className="map-alternative" id="map-description" aria-labelledby="map-alt-title">
          <div><p className="section-number">Карта без визуального слоя</p><h2 id="map-alt-title">Текстовое представление ареалов</h2></div>
          <ul>{people.map((item) => <li key={item.id}><button type="button" onClick={() => choosePeople(item.id)}><strong>{item.name}</strong><span>{item.area}</span><Icon name="arrow" size={18} /></button></li>)}</ul>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-title"><p className="section-number">01 / О каталоге</p><h2 id="about-title">Сохранять не только предметы, но и живую память</h2></div>
          <div className="about-copy"><p>Нематериальное этнокультурное наследие живет в действиях людей: в обрядах и праздниках, ремесленных навыках, песнях, преданиях, способах хозяйствования и передачи опыта.</p><p>Каталог объединяет научные описания объектов, фотографии, видеоматериалы и музейные предметы, связанные с ними. Он создается научным коллективом Кемеровского государственного института культуры при поддержке гранта Российского научного фонда.</p><a className="inline-link" href="#classification">Посмотреть классификацию <Icon name="arrow" size={18} /></a></div>
        </section>

        <section className="people-section" aria-labelledby="people-title">
          <div className="section-intro"><p className="section-number">02 / Народы</p><h2 id="people-title">Разные традиции.<br />Один регион.</h2><p>Разделы равнозначны и раскрывают наследие через практики, территории и связанные музейные свидетельства.</p></div>
          <div className="people-list">
            {people.map((item, index) => (
              <article className="people-story" id={`people-${item.id}`} key={item.id}>
                <div className="people-image"><img src={`${baseUrl}${item.image}`} alt={item.alt} loading="lazy" width="1200" height="800" /><span>0{index + 1}</span></div>
                <div className="people-copy"><p className="kicker">{item.eyebrow}</p><h3>{item.name}</h3><p>{item.summary}</p><p className="area"><Icon name="marker" size={19} />{item.area}</p><div className="story-links"><button type="button" className="primary-button compact" onClick={() => openCatalog({ people: item.id })}>Смотреть наследие <Icon name="arrow" /></button><a href={item.source} target="_blank" rel="noreferrer">Источник изображения</a></div></div>
              </article>
            ))}
          </div>
        </section>

        <section className="classification" id="classification" aria-labelledby="classification-title">
          <div className="classification-intro"><p className="section-number">03 / Классификация</p><h2 id="classification-title">Нематериальное культурное наследие разнообразно и неоднородно</h2><p>Для удобства объекты объединяются в категории. Выберите направление, чтобы перейти к записям каталога.</p></div>
          <ol className="category-list">
            {categories.map((category) => <li key={category.id}><button type="button" onClick={() => openCatalog({ category: category.id })}><span className="category-index">{category.index}</span><span className="category-name">{category.label}</span><span className="category-description">{category.items.map((item) => <span key={item}>{item}</span>)}</span><Icon name="arrow" /></button></li>)}
          </ol>
        </section>

        <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
          <div className="catalog-head"><div><p className="section-number">04 / Каталог</p><h2 id="catalog-title">Найдите объект наследия</h2></div><p>Демонстрационные записи показывают будущую логику поиска и фильтров. Они не являются утвержденными карточками реестра.</p></div>
          <form className="catalog-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="heritage-search">Поиск по ключевому слову или наименованию объекта</label>
            <div className="search-field"><Icon name="search" size={23} /><input id="heritage-search" type="search" value={query} autoComplete="off" aria-autocomplete="list" aria-controls="search-suggestions" aria-expanded={searchOpen} placeholder="Например, ткачество или обряд" onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} /><button type="submit">Найти</button></div>
            {searchOpen && <div className="suggestions" id="search-suggestions" role="listbox" aria-label="Подсказки поиска">{suggestions.length ? suggestions.map((suggestion) => <button type="button" role="option" aria-selected="false" key={suggestion} onClick={() => { setQuery(suggestion); openCatalog({ query: suggestion }) }}><Icon name="search" size={17} />{suggestion}</button>) : <p>Подсказок нет. Проверьте написание или выберите категорию ниже.</p>}</div>}
          </form>
          <div className="filters" aria-label="Фильтры каталога">
            <label>Народ<select value={filters.people} onChange={(event) => setFilters({ ...filters, people: event.target.value })}><option value="all">Все народы</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Вид наследия<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="all">Все виды</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Сохранность<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">Все состояния</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button type="button" className="text-button reset-filter" onClick={() => { setFilters(initialFilters); setQuery("") }}><Icon name="reset" size={17} />Сбросить</button>
          </div>
          <div className="results-summary" aria-live="polite"><span>{filteredItems.length} {filteredItems.length === 1 ? "запись" : filteredItems.length > 1 && filteredItems.length < 5 ? "записи" : "записей"}</span><span>Прототип данных</span></div>
          {filteredItems.length ? <div className="catalog-list">{filteredItems.map((item) => {
            const person = people.find((value) => value.id === item.people)
            const category = categories.find((value) => value.id === item.category)
            return <article key={item.id}><span className={`status-dot status-${item.status}`} aria-hidden="true" /><div><p>{person.name} / {category.label}</p><h3>{item.title}</h3><span>{item.place}</span></div><div className="item-status"><small>Степень сохранности</small><b>{statuses[item.status]}</b></div><button type="button" aria-label={`Открыть запись «${item.title}»`} onClick={() => setAnnouncement(`Карточка «${item.title}» появится на следующем этапе прототипа`)}><Icon name="arrow" /></button></article>
          })}</div> : <div className="empty-state"><Icon name="book" size={32} /><h3>По выбранным условиям записей пока нет</h3><p>Попробуйте убрать один из фильтров или изменить поисковый запрос.</p><button className="primary-button compact" type="button" onClick={() => { setFilters(initialFilters); setQuery("") }}>Показать все записи</button></div>}
        </section>

        <section className="final-cta" style={{ "--final-cta-image": `url("${baseUrl}assets/shor-culture.webp")` }}><p className="kicker">Исследуйте наследие Кузбасса</p><h2>От живой традиции<br />к научному описанию</h2><button className="primary-button light" type="button" onClick={() => scrollTo("catalog")}>Открыть каталог <Icon name="arrow" /></button></section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><img src={`${baseUrl}assets/kuzbass-coat-of-arms.png`} width="54" height="63" alt="" /><div><strong>Кемеровский государственный институт культуры</strong><span>Научно-просветительский проект</span></div></div>
        <div><p>Разделы</p><a href="#people-shor">Шорцы</a><a href="#people-teleut">Телеуты</a><a href="#catalog">Каталог</a></div>
        <div><p>Документы</p><a href={`${baseUrl}SOURCES.md`}>Источники материалов</a><a href={`${baseUrl}PRIVACY.md`}>Политика конфиденциальности</a><a href={`${baseUrl}USAGE.md`}>Правила использования</a></div>
        <div className="footer-bottom"><span>© 2026 КемГИК</span><span>Прототип. Не является опубликованным официальным реестром.</span></div>
      </footer>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  )
}
