import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geography from './kuzbass-map-data.geo.json'
import geographyUrl from './kuzbass-map-data.geo.json?url'
import districts from './kuzbass-districts.geo.json'
import districtsUrl from './kuzbass-districts.geo.json?url'
import { catalogHref } from './catalog.mjs'
import { mapSettings, selectedPlaces, placeLatLng, shouldClusterTeleuts } from './map-interaction.mjs'
import './settlement-map.css'

const baseUrl = import.meta.env.BASE_URL
const boundary = geography.features.find(feature => feature.properties.kind === 'boundary')
const places = geography.features.filter(feature => feature.properties.kind === 'settlement')
const groups = [['all', 'Все'], ['shor', 'Шорцы'], ['teleut', 'Телеуты']]

function textElement(tag, text, className) {
  const element = document.createElement(tag)
  element.textContent = text
  if (className) element.className = className
  return element
}

function placePopup(place) {
  const content = document.createElement('div')
  content.append(textElement('strong', place.properties.name), textElement('p', place.properties.area))
  const link = textElement('a', 'Открыть наследие ' + (place.properties.people[0] === 'shor' ? 'шорцев' : 'телеутов'))
  link.href = catalogHref({ people: place.properties.people[0] }, null, baseUrl)
  content.append(link)
  return content
}

export default function SettlementMap({ activePeople = 'all', onPeopleChange, textSize = 'normal', spaced = false }) {
  const group = groups.some(([id]) => id === activePeople) ? activePeople : 'all'
  const [expanded, setExpanded] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [showDistricts, setShowDistricts] = useState(true)
  const [tileError, setTileError] = useState(false)
  const [zoom, setZoom] = useState(null)
  const root = useRef(null)
  const canvas = useRef(null)
  const runtime = useRef(null)
  const expandButton = useRef(null)
  const infoButton = useRef(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(pointer: coarse)')
    const map = L.map(canvas.current, {
      ...mapSettings,
      zoomControl: false,
      zoomAnimation: !reduced.matches,
      fadeAnimation: !reduced.matches,
      markerZoomAnimation: !reduced.matches,
      dragging: !coarse.matches,
    })
    map.attributionControl.setPrefix(false)
    L.control.zoom({ position: 'topright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map)
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 100 }).addTo(map)
    const tiles = L.tileLayer(mapSettings.tileUrl, {
      maxZoom: mapSettings.maxZoom,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      keepBuffer: 1,
      updateWhenIdle: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    }).addTo(map)
    tiles.on('tileerror', () => setTileError(true))
    const outline = L.geoJSON(boundary, { interactive: false, style: { color: '#3c657b', weight: 2, fill: false, opacity: .85 } }).addTo(map)
    const fallbackRivers = L.geoJSON({ type: 'FeatureCollection', features: geography.features.filter(feature => feature.properties.kind === 'river') }, {
      interactive: false, style: { color: '#6a9bb4', weight: 1.3, opacity: .45 },
    }).addTo(map)
    const districtLayer = L.geoJSON(districts, {
      style: { color: '#405b6b', weight: 1.25, dashArray: '5 5', fillColor: '#52758a', fillOpacity: .035 },
      onEachFeature(feature, layer) {
        layer.bindTooltip(textElement('span', feature.properties.name), { sticky: true, className: 'geo-district-tooltip', direction: 'auto' })
        layer.bindPopup(textElement('strong', feature.properties.name), { maxWidth: 260, className: 'geo-place-popup' })
        layer.on('mouseover', () => layer.setStyle({ weight: 2, fillOpacity: .12 }))
        layer.on('mouseout', () => districtLayer.resetStyle(layer))
      },
    }).addTo(map)
    const markers = L.layerGroup().addTo(map)
    let currentGroup = 'all'
    let pendingFocus = null

    const fitPlaces = (value, animate = true) => {
      const points = selectedPlaces(places, value).map(placeLatLng)
      const padding = value === 'teleut' ? { paddingTopLeft: [28, 52], paddingBottomRight: [112, 52] } : { padding: [54, 54] }
      map.fitBounds(L.latLngBounds(points).pad(.22), { ...padding, maxZoom: value === 'teleut' ? 13 : 10, animate: animate && !reduced.matches, duration: .35 })
    }
    const drawPlaces = (restoreFocus = false) => {
      const focusedId = document.activeElement?.getAttribute('data-map-place')
      if (focusedId) pendingFocus = focusedId
      markers.clearLayers()
      const visible = selectedPlaces(places, currentGroup)
      const clustered = shouldClusterTeleuts(map.getZoom(), currentGroup)
      for (const place of visible) {
        if (clustered && place.properties.people.includes('teleut')) continue
        const people = place.properties.people[0]
        const symbol = textElement('span', '', 'geo-marker-symbol')
        const marker = L.marker(placeLatLng(place), {
          icon: L.divIcon({ html: symbol, className: 'geo-place-marker geo-place-marker--' + people, iconSize: [44, 44], iconAnchor: [22, 22] }),
          title: place.properties.name,
          alt: place.properties.name,
          riseOnHover: true,
          keyboard: true,
        }).addTo(markers)
        const direction = place.properties.id === 'bekovo' ? 'bottom' : place.properties.id === 'shanda' ? 'right' : place.properties.id === 'myski' ? 'left' : 'top'
        marker.bindTooltip(textElement('span', place.properties.name), { permanent: true, interactive: true, direction, offset: direction === 'top' ? [0, -10] : direction === 'bottom' ? [0, 10] : [0, 0], className: 'geo-place-tooltip geo-place-tooltip--' + people })
        marker.bindPopup(placePopup(place), { maxWidth: 260, className: 'geo-place-popup' })
        marker.getTooltip().on('click', () => marker.openPopup())
        marker.getElement()?.setAttribute('data-map-place', place.properties.id)
        marker.getElement()?.setAttribute('aria-label', place.properties.name)
        if (restoreFocus && pendingFocus === place.properties.id) {
          marker.getElement()?.focus({ preventScroll: true })
          pendingFocus = null
        }
      }
      if (clustered) {
        const bekovo = places.find(place => place.properties.id === 'bekovo')
        const marker = L.marker(placeLatLng(bekovo), {
          icon: L.divIcon({ html: textElement('span', '3', 'geo-cluster-symbol'), className: 'geo-place-cluster', iconSize: [44, 44], iconAnchor: [22, 22] }),
          title: 'Показать Беково, Челухоево и Шанду', alt: 'Показать Беково, Челухоево и Шанду', keyboard: true,
        }).addTo(markers)
        marker.getElement()?.setAttribute('aria-label', 'Показать Беково, Челухоево и Шанду')
        marker.bindTooltip(textElement('span', 'Беково и ещё 2'), { permanent: true, direction: 'top', offset: [0, -12], className: 'geo-place-tooltip geo-place-tooltip--teleut' })
        marker.on('click', () => { pendingFocus = 'bekovo'; onPeopleChange?.('teleut') })
      }
    }
    const updateView = () => { drawPlaces(true); setZoom(map.getZoom()) }
    map.on('zoomend', updateView)
    map.on('popupopen', event => {
      const close = event.popup.getElement()?.querySelector('.leaflet-popup-close-button')
      close?.setAttribute('aria-label', 'Закрыть сведения')
      close?.setAttribute('title', 'Закрыть сведения')
    })
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    resize.observe(canvas.current)
    const applyMotion = () => {
      map.options.zoomAnimation = !reduced.matches
      map.options.fadeAnimation = !reduced.matches
      map.options.markerZoomAnimation = !reduced.matches
    }
    reduced.addEventListener('change', applyMotion)
    runtime.current = {
      map, tiles, districtLayer, coarse,
      setGroup(value) { currentGroup = value; drawPlaces(); fitPlaces(value) },
      showRegion() { map.fitBounds(outline.getBounds(), { padding: [36, 36], animate: !reduced.matches, duration: .35 }) },
      fitPlaces,
    }
    fitPlaces('all', false)
    updateView()
    if (window.location.hash === '#settlement-map-title') requestAnimationFrame(() => root.current?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    return () => {
      resize.disconnect()
      reduced.removeEventListener('change', applyMotion)
      runtime.current = null
      fallbackRivers.remove()
      map.remove()
    }
  }, [])

  useEffect(() => { runtime.current?.setGroup(group) }, [group])
  useEffect(() => {
    const current = runtime.current
    if (!current) return
    if (showDistricts) current.districtLayer.addTo(current.map)
    else current.districtLayer.remove()
  }, [showDistricts])
  useEffect(() => {
    const current = runtime.current
    if (!current) return
    if (expanded || !current.coarse.matches) current.map.dragging.enable()
    else current.map.dragging.disable()
    current.map.invalidateSize({ pan: false })
  }, [expanded])
  useEffect(() => {
    runtime.current?.map.eachLayer(layer => layer.getTooltip?.()?.update())
  }, [textSize, spaced])
  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = previousOverflow
      expandButton.current?.focus({ preventScroll: true })
    }
  }, [expanded])
  useEffect(() => {
    if (!expanded && !infoOpen) return
    const onKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (infoOpen) { setInfoOpen(false); infoButton.current?.focus() }
        else setExpanded(false)
      }
      if (expanded && event.key === 'Tab') {
        const elements = [...root.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length)
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [expanded, infoOpen])

  const chooseGroup = value => value === group ? runtime.current?.setGroup(value) : onPeopleChange?.(value)

  return <>
    {expanded && <div className="geo-map-backdrop" aria-hidden="true"/>}
    <section className={'map-stage settlement-map' + (expanded ? ' is-expanded' : '')} ref={root} tabIndex={expanded ? -1 : undefined} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined} aria-labelledby="settlement-map-title">
      <header className="map-heading"><p className="kicker">Кемеровская область - Кузбасс</p><h2 id="settlement-map-title">Народы на карте</h2></header>
      <div className="geo-map-toolbar"><div className="geo-map-groups" role="group" aria-label="Народ на карте">
        {groups.map(([id, name]) => <button type="button" key={id} aria-pressed={group === id} data-people={id} onClick={() => chooseGroup(id)}>{name}</button>)}
      </div></div>
      <div className="geo-map-frame">
        <div className="geo-map-container" ref={canvas} role="region" aria-label="Интерактивная карта Кузбасса" aria-describedby="geo-map-instructions"/>
        <div className="geo-map-tools">
          <button type="button" className="geo-map-tool" aria-label="Показать весь Кузбасс" title="Весь Кузбасс" onClick={() => runtime.current?.showRegion()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
          <button ref={expandButton} type="button" className="geo-map-tool" aria-label={expanded ? 'Свернуть карту' : 'Развернуть карту'} title={expanded ? 'Свернуть' : 'На весь экран'} aria-pressed={expanded} onClick={() => { setInfoOpen(false); setExpanded(value => !value) }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{expanded ? <path d="M4 9h5V4M15 4v5h5M20 15h-5v5M9 20v-5H4"/> : <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>}</svg></button>
          <button type="button" className="geo-map-tool geo-district-switch" aria-label="Границы округов" aria-pressed={showDistricts} onClick={() => setShowDistricts(value => !value)} title="Границы округов"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2ZM9 3v15M15 6v15"/></svg><span>Округа</span></button>
        </div>
        <button ref={infoButton} type="button" className="geo-map-tool geo-info-button" aria-label="О карте и источниках" aria-expanded={infoOpen} aria-controls="geo-map-info" onClick={() => setInfoOpen(value => !value)}>i</button>
        {infoOpen && <aside className="geo-map-info" id="geo-map-info" aria-label="О карте и источниках">
          <div className="geo-info-heading"><strong>О карте</strong><button type="button" className="geo-map-tool" aria-label="Закрыть информацию" onClick={() => { setInfoOpen(false); infoButton.current?.focus() }}>×</button></div>
          <p>Отмечены отдельные места проживания шорцев и телеутов, не этнические границы. Это не полный список поселений.</p>
          <p>Пунктиром показаны 13 городских и муниципальных округов юга Кузбасса по OpenStreetMap, срез 22.10.2026. Границы обзорные, не кадастровые.</p>
          <details className="geo-district-list"><summary>Показанные округа</summary><ul>{districts.features.map(feature => <li key={feature.properties.id}>{feature.properties.name}</li>)}</ul></details>
          <p>Сведения о расселении: <a href={geography.settlementSources.shor.url} target="_blank" rel="noopener noreferrer">АКМНСС и ДВ РФ</a>, <a href={geography.settlementSources.teleut.url} target="_blank" rel="noopener noreferrer">ИЭА РАН</a>.</p>
          <p>Подложка OpenStreetMap загружается через интернет. Местоположение посетителя не запрашивается. Контур области - geoBoundaries / OSM, 2017.</p>
          <div className="geo-info-links"><a href={geographyUrl} download="kuzbass-map-data.geo.json">Точки и реки GeoJSON</a><a href={districtsUrl} download="kuzbass-districts.geo.json">Округа GeoJSON</a><a href={baseUrl + 'SOURCES.md'}>Все источники</a></div>
        </aside>}
        {tileError && <div className="geo-map-error" role="status"><span>Подложка загрузилась не полностью</span><button type="button" onClick={() => { setTileError(false); runtime.current?.tiles.redraw() }}>Повторить</button></div>}
      </div>
      <p className="sr-only" id="geo-map-instructions">Масштаб меняется кнопками плюс и минус, колесом мыши, двойным щелчком или двумя пальцами. Стрелки перемещают карту при фокусе на ней. На телефоне один палец прокручивает страницу; для свободного перемещения одним пальцем разверните карту. Сведения о месте открываются нажатием на его точку. {zoom !== null ? 'Текущий масштаб ' + zoom.toFixed(1) + '.' : ''}</p>
    </section>
  </>
}
