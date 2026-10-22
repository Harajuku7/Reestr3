import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fitProjection, geometryPath, geometryPoints, insideBoundary, layoutLabels, mercator, rectanglesOverlap, scaleBar } from './map-geometry.mjs'

const data = JSON.parse(readFileSync(new URL('./kuzbass-map-data.geo.json', import.meta.url)))
const boundary = data.features.find(feature => feature.properties.kind === 'boundary')
const places = data.features.filter(feature => feature.geometry.type === 'Point')

test('map uses one identified regional outline, not ethnic polygons', () => {
  assert.equal(boundary.properties.iso, 'RU-KEM')
  assert.equal(data.features.filter(feature => feature.properties.kind === 'boundary').length, 1)
  assert.equal(data.features.filter(feature => feature.properties.kind === 'settlement').length, 6)
  assert.equal(data.features.filter(feature => feature.properties.kind === 'river').length, 5)
  assert.equal(data.license, 'ODbL-1.0')
})

test('settlement coordinates lie inside Kuzbass and retain verifiable sources', () => {
  for (const place of places) {
    assert.ok(insideBoundary(place.geometry.coordinates, boundary.geometry), place.properties.name)
    assert.match(place.properties.coordinateSource, /^https:\/\/www\.openstreetmap\.org\/(relation|way)\/\d+$/)
    if (place.properties.kind === 'settlement') assert.match(place.properties.settlementSource, /^https:\/\/(www\.atlaskmns\.ru|raipon\.info)\//)
  }
})

test('projection puts north above south and east to the right', () => {
  const projection = fitProjection(geometryPoints(boundary.geometry), 640, 600)
  const town = id => places.find(place => place.properties.id === id).geometry.coordinates
  assert.ok(projection.project(town('kemerovo'))[1] < projection.project(town('tashtagol'))[1])
  assert.ok(projection.project(town('shanda'))[0] < projection.project(town('chelukhoyevo'))[0])
  assert.throws(() => mercator([0, 90]), RangeError)
  assert.throws(() => mercator([NaN, 50]), RangeError)
})

test('all outline vertices fit the frame; river paths remain finite', () => {
  const coordinates = geometryPoints(boundary.geometry)
  const projection = fitProjection(coordinates, 640, 600, 48)
  for (const coordinate of coordinates) {
    const [x, y] = projection.project(coordinate)
    assert.ok(x >= 47.9 && x <= 592.1 && y >= 47.9 && y <= 552.1)
  }
  for (const feature of data.features.filter(feature => feature.geometry.type !== 'Point')) {
    const path = geometryPath(feature.geometry, projection.project)
    assert.ok(path.startsWith('M'))
    assert.doesNotMatch(path, /NaN|Infinity|undefined/)
  }
})

test('labels keep geographic anchors and avoid overlaps in regional and village views', () => {
  for (const width of [280, 335, 520, 640]) for (const group of ['shor', 'teleut']) {
    const height = width * 15 / 16
    const selected = places.filter(place => place.properties.people.includes(group))
    const projection = fitProjection(selected.map(place => place.geometry.coordinates), width, height, 48, 18000)
    const pins = selected.map(place => { const [x, y] = projection.project(place.geometry.coordinates); return { id: place.properties.id, name: place.properties.name, x, y } })
    const labels = layoutLabels(pins, width, height)
    assert.equal(labels.length, selected.length, `${group} at ${width}`)
    for (const label of labels) {
      assert.equal(label.x, pins.find(pin => pin.id === label.id).x)
      assert.equal(label.y, pins.find(pin => pin.id === label.id).y)
      assert.ok(label.rect.x >= 0 && label.rect.x + label.rect.width <= width)
      assert.ok(label.rect.y >= 0 && label.rect.y + label.rect.height <= height)
      assert.ok(labels.every(other => other === label || !rectanglesOverlap(label.rect, other.rect)))
      assert.ok(!pins.some(pin => rectanglesOverlap(label.rect, { x: pin.x - 5, y: pin.y - 5, width: 10, height: 10 }, 2)), 'label must not cover a geographic point')
    }
  }
})

test('scale follows actual projection rather than a fixed decorative bar', () => {
  for (const width of [280, 640]) {
    const projection = fitProjection(geometryPoints(boundary.geometry), width, 600)
    const bar = scaleBar(projection)
    assert.ok(bar.width > 0 && bar.width <= 100)
    assert.ok(bar.kilometers > 0)
  }
})

test('primary place labels remain available with large text on narrow portrait maps', () => {
  for (const width of [265, 277, 335]) for (const group of ['shor', 'teleut']) {
    const height = width * 5 / 4
    const selected = places.filter(place => place.properties.people.includes(group))
    const framePlaces = group === 'teleut' ? [...selected, ...places.filter(place => place.properties.detailOnly)] : selected
    const projection = fitProjection(framePlaces.map(place => place.geometry.coordinates), width, height, width * .15, 18000)
    const pins = selected.map(place => { const [x, y] = projection.project(place.geometry.coordinates); return { id: place.properties.id, name: place.properties.name, x, y } })
    for (const fontSize of [12.48, 16.4, 20]) {
      const labels = layoutLabels(pins, width, height, fontSize)
      assert.equal(labels.length, selected.length, `${group}: ${width}px / font ${fontSize}`)
      assert.ok(labels.every(label => label.rect.height >= 44))
    }
  }
})
