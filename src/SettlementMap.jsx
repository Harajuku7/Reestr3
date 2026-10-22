import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geography from './kuzbass-map-data.geo.json'
import districts from './kuzbass-districts.geo.json'
import { catalogHref } from './catalog.mjs'
import { mapSettings, selectedPlaces, placeLatLng } from './map-interaction.mjs'
import { layoutLabels } from './map-geometry.mjs'
import { tileRetry, tileCoverage } from './map-tiles.mjs'
import './settlement-map.css'

const baseUrl = import.meta.env.BASE_URL
const boundary = geography.features.find(feature => feature.properties.kind === 'boundary')
const places = geography.features.filter(feature => feature.properties.kind === 'settlement')
const groups = [['all', 'Все'], ['shor', 'Шорцы'], ['teleut', 'Телеуты']]

const RetryingTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const attempt = tileRetry(done, tile => { tile.src = this.getTileUrl(coords) })
    const tile = L.TileLayer.prototype.createTile.call(this, coords, (error, image) => attempt.complete(error, image))
    this.tileAttempts ??= new Map()
    this.tileAttempts.set(tile, attempt)
    return tile
  },
  onRemove(map) {
    for (const attempt of this.tileAttempts?.values() ?? []) attempt.dispose()
    this.tileAttempts?.clear()
    L.TileLayer.prototype.onRemove.call(this, map)
  },
})

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
  const [showDistricts, setShowDistricts] = useState(true)
  const [tileError, setTileError] = useState(false)
  const [zoom, setZoom] = useState(null)
  const root = useRef(null)
  const canvas = useRef(null)
  const runtime = useRef(null)
  const expandButton = useRef(null)

  useEffect(() => {
    let disposed = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const map = L.map(canvas.current, {
      ...mapSettings,
      zoomControl: false,
      zoomAnimation: !reduced.matches,
      fadeAnimation: !reduced.matches,
      markerZoomAnimation: !reduced.matches,
    })
    map.attributionControl.setPrefix(false)
    L.control.zoom({ position: 'topright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map)
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 100 }).addTo(map)
    const tileStates = new Map()
    const tiles = new RetryingTileLayer(mapSettings.tileUrl, {
      maxZoom: mapSettings.maxZoom,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      keepBuffer: 1,
      updateWhenIdle: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    })
    const updateTileStatus = () => {
      if (disposed) return
      const coverage = tileCoverage([...tileStates].map(([tile, state]) => ({ ...state, rect: tile.getBoundingClientRect() })), map.getZoom(), canvas.current.getBoundingClientRect())
      setTileError(coverage.failed > 0 && coverage.pending === 0)
    }
    for (const [eventName, state] of [['tileloadstart', 'pending'], ['tileload', 'loaded'], ['tileerror', 'failed']]) {
      tiles.on(eventName, event => { tileStates.set(event.tile, { zoom: event.coords.z, state }); updateTileStatus() })
    }
    tiles.on('tileunload', event => {
      tiles.tileAttempts?.get(event.tile)?.dispose()
      tiles.tileAttempts?.delete(event.tile)
      tileStates.delete(event.tile)
      updateTileStatus()
    })
    tiles.on('load', updateTileStatus)
    tiles.addTo(map)
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
    const leaders = L.layerGroup().addTo(map)
    let currentGroup = 'all'
    let markerRecords = []

    const fitPlaces = (value, animate = true) => {
      const points = selectedPlaces(places, value).map(placeLatLng)
      const padding = value === 'teleut' ? { paddingTopLeft: [28, 52], paddingBottomRight: [112, 52] } : { padding: [54, 54] }
      map.fitBounds(L.latLngBounds(points).pad(.22), { ...padding, maxZoom: value === 'teleut' ? 13 : 10, animate: animate && !reduced.matches, duration: .35 })
    }
    const positionLabels = () => {
      if (disposed) return
      leaders.clearLayers()
      const size = map.getSize()
      const viewport = canvas.current.getBoundingClientRect()
      const reserved = [...root.current.querySelectorAll('.leaflet-control-zoom, .geo-map-tools, .leaflet-control-attribution, .leaflet-control-scale')].map(element => {
        const rect = element.getBoundingClientRect()
        return { x: rect.left - viewport.left, y: rect.top - viewport.top, width: rect.width, height: rect.height }
      })
      const pins = []
      for (const record of markerRecords) {
        const point = map.latLngToContainerPoint(record.marker.getLatLng())
        const tooltip = record.marker.getTooltip()
        const element = tooltip.getElement()
        const visible = point.x >= 0 && point.x <= size.x && point.y >= 0 && point.y <= size.y
        element.style.visibility = visible ? '' : 'hidden'
        element.setAttribute('aria-hidden', String(!visible))
        record.button.tabIndex = visible ? 0 : -1
        if (!visible) continue
        const rect = element.getBoundingClientRect()
        pins.push({ ...record, x: point.x, y: point.y, width: rect.width, height: rect.height })
      }
      for (const pin of layoutLabels(pins, size.x, size.y, 14, reserved)) {
        const { rect, marker } = pin
        const tooltip = marker.getTooltip()
        tooltip.options.offset = L.point(rect.x + rect.width / 2 - pin.x, rect.y + rect.height / 2 - pin.y)
        tooltip.setLatLng(marker.getLatLng())
        const endpoint = L.point(Math.max(rect.x, Math.min(rect.x + rect.width, pin.x)), Math.max(rect.y, Math.min(rect.y + rect.height, pin.y)))
        L.polyline([marker.getLatLng(), map.containerPointToLatLng(endpoint)], { color: pin.people === 'shor' ? '#176b5c' : '#07588d', weight: 1.2, opacity: .7, interactive: false }).addTo(leaders)
      }
    }
    const drawPlaces = () => {
      markers.clearLayers()
      markerRecords = []
      const visible = selectedPlaces(places, currentGroup)
      for (const place of visible) {
        const people = place.properties.people[0]
        const symbol = textElement('span', '', 'geo-marker-symbol')
        const marker = L.marker(placeLatLng(place), {
          icon: L.divIcon({ html: symbol, className: 'geo-place-marker geo-place-marker--' + people, iconSize: [44, 44], iconAnchor: [22, 22] }),
          title: place.properties.name,
          alt: place.properties.name,
          riseOnHover: true,
          keyboard: false,
        }).addTo(markers)
        const button = textElement('button', place.properties.name, 'geo-place-label')
        button.type = 'button'
        button.setAttribute('data-place-label', place.properties.id)
        L.DomEvent.disableClickPropagation(button)
        L.DomEvent.on(button, 'click', () => marker.openPopup())
        marker.bindTooltip(button, { permanent: true, interactive: true, direction: 'center', opacity: 1, className: 'geo-place-tooltip geo-place-tooltip--' + people })
        marker.getTooltip().getElement()?.setAttribute('role', 'presentation')
        marker.bindPopup(placePopup(place), { maxWidth: 260, className: 'geo-place-popup' })
        marker.getElement()?.setAttribute('data-map-place', place.properties.id)
        marker.getElement()?.setAttribute('aria-hidden', 'true')
        markerRecords.push({ id: place.properties.id, name: place.properties.name, people, marker, button })
      }
      positionLabels()
    }
    const updateView = () => { positionLabels(); setZoom(map.getZoom()); updateTileStatus() }
    map.on('zoomend', updateView)
    map.on('moveend resize', () => { positionLabels(); updateTileStatus() })
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
      map, tiles, districtLayer, positionLabels,
      setGroup(value) { currentGroup = value; drawPlaces(); fitPlaces(value) },
      showRegion() { map.fitBounds(outline.getBounds(), { padding: [36, 36], animate: !reduced.matches, duration: .35 }) },
      fitPlaces,
    }
    fitPlaces('all', false)
    drawPlaces()
    updateView()
    if (window.location.hash === '#settlement-map-title') requestAnimationFrame(() => root.current?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    return () => {
      disposed = true
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
    current.map.invalidateSize({ pan: false })
  }, [expanded])
  useEffect(() => {
    runtime.current?.positionLabels()
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
    if (!expanded) return
    const onKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setExpanded(false)
      }
      if (expanded && event.key === 'Tab') {
        const elements = [...root.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [expanded])

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
          <button ref={expandButton} type="button" className="geo-map-tool" aria-label={expanded ? 'Свернуть карту' : 'Развернуть карту'} title={expanded ? 'Свернуть' : 'На весь экран'} aria-pressed={expanded} onClick={() => setExpanded(value => !value)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{expanded ? <path d="M4 9h5V4M15 4v5h5M20 15h-5v5M9 20v-5H4"/> : <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>}</svg></button>
          <button type="button" className="geo-map-tool geo-district-switch" aria-label="Границы округов" aria-pressed={showDistricts} onClick={() => setShowDistricts(value => !value)} title="Границы округов"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2ZM9 3v15M15 6v15"/></svg><span>Округа</span></button>
        </div>
        {tileError && <div className="geo-map-error" role="status"><span>Подложка загрузилась не полностью</span><button type="button" onClick={() => { setTileError(false); runtime.current?.tiles.redraw() }}>Повторить</button></div>}
      </div>
      <p className="sr-only" id="geo-map-instructions">Масштаб меняется кнопками плюс и минус, колесом мыши, двойным щелчком или двумя пальцами. Перетаскивайте карту мышью или пальцем. Стрелки перемещают карту при фокусе на ней. Подписи разнесены для читаемости и соединены линиями с настоящими координатами. Сведения о месте открываются нажатием на его название. {zoom !== null ? 'Текущий масштаб ' + zoom.toFixed(1) + '.' : ''}</p>
    </section>
  </>
}
