import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapSettings, selectedPlaces, placeLatLng, shouldClusterTeleuts } from './map-interaction.mjs'
import { geometryPoints, insideBoundary } from './map-geometry.mjs'

const geography = JSON.parse(readFileSync(new URL('./kuzbass-map-data.geo.json', import.meta.url)))
const districts = JSON.parse(readFileSync(new URL('./kuzbass-districts.geo.json', import.meta.url)))
const places = geography.features.filter(feature => feature.properties.kind === 'settlement')

test('map provides gradual bidirectional zoom, wheel, pinch and keyboard, not two static views', () => {
  assert.ok(mapSettings.maxZoom - mapSettings.minZoom >= 10)
  assert.ok(mapSettings.zoomDelta > 0 && mapSettings.zoomDelta < 1)
  assert.ok(mapSettings.zoomSnap <= mapSettings.zoomDelta)
  assert.equal(mapSettings.scrollWheelZoom, true)
  assert.equal(mapSettings.touchZoom, true)
  assert.equal(mapSettings.keyboard, true)
  assert.equal(mapSettings.tileUrl, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
})

test('filters preserve all scientific places, coordinate order and cluster discovery', () => {
  assert.equal(selectedPlaces(places, 'all').length, 6)
  assert.equal(selectedPlaces(places, 'shor').length, 3)
  assert.equal(selectedPlaces(places, 'teleut').length, 3)
  for (const place of places) assert.deepEqual(placeLatLng(place), [...place.geometry.coordinates].reverse())
  assert.equal(shouldClusterTeleuts(8), true)
  assert.equal(shouldClusterTeleuts(11.5), false)
  assert.equal(shouldClusterTeleuts(18), false)
  assert.equal(shouldClusterTeleuts(8, 'teleut'), false, 'explicit people selection must reveal the villages even on a narrow map')
  assert.equal(shouldClusterTeleuts(10.75, 'teleut'), false)
})

test('municipality layer has sourced admin-level-6 polygons, never mines or ethnic areas', () => {
  assert.equal(districts.features.length, 13)
  assert.equal(districts.license, 'ODbL-1.0')
  assert.match(districts.coverage, /selected/)
  assert.equal(new Set(districts.features.map(feature => feature.properties.id)).size, 13)
  for (const feature of districts.features) {
    assert.equal(feature.properties.adminLevel, 6)
    assert.equal(feature.properties.kind, 'municipality')
    assert.ok(['Polygon', 'MultiPolygon'].includes(feature.geometry.type))
    assert.match(feature.properties.sourceUrl, /^https:\/\/www\.openstreetmap\.org\/relation\/\d+$/)
    assert.match(feature.properties.name, /(?:муниципальный|городской) округ$/)
    assert.doesNotMatch(feature.properties.name, /разрез|шорц|телеут/i)
    assert.ok(geometryPoints(feature.geometry).every(([lon, lat]) => lon > 84 && lon < 90 && lat > 51 && lat < 57))
  }
})

test('all six scientific places fall inside their actual named municipalities', () => {
  const expected = { bekovo: 'district-1149117', chelukhoyevo: 'district-1149117', shanda: 'district-1149118', tashtagol: 'district-1148323', myski: 'district-1151562', mezhdurechensk: 'district-1151561' }
  for (const place of places) {
    const district = districts.features.find(feature => feature.properties.id === expected[place.properties.id])
    assert.ok(insideBoundary(place.geometry.coordinates, district.geometry), place.properties.name)
  }
  assert.equal(districts.features.find(feature => feature.properties.id === 'district-1151561').properties.name, 'Междуреченский муниципальный округ')
})
