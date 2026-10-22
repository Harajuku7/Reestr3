const radius = 6378137
const radians = Math.PI / 180

export function mercator(coordinate) {
  const [longitude, latitude] = coordinate
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 85) throw new RangeError('Invalid map coordinate')
  return [radius * longitude * radians, -radius * Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2))]
}

export function geometryPoints(geometry) {
  if (!geometry?.coordinates) return []
  const visit = value => typeof value[0] === 'number' ? [value] : value.flatMap(visit)
  return visit(geometry.coordinates)
}

export function fitProjection(coordinates, width, height, padding = 48, minimumSpan = 0) {
  if (!coordinates.length || width <= padding * 2 || height <= padding * 2) throw new RangeError('Map frame is too small')
  const values = coordinates.map(mercator)
  const xs = values.map(point => point[0]), ys = values.map(point => point[1])
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys)
  const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2
  const scale = Math.min((width - padding * 2) / Math.max(xmax - xmin, minimumSpan, 1), (height - padding * 2) / Math.max(ymax - ymin, minimumSpan, 1))
  const project = coordinate => { const [x, y] = mercator(coordinate); return [width / 2 + (x - cx) * scale, height / 2 + (y - cy) * scale] }
  const latitude = (2 * Math.atan(Math.exp(-cy / radius)) - Math.PI / 2) / radians
  return { project, scale, latitude }
}

export function geometryPath(geometry, project) {
  const line = (coordinates, closed = false) => coordinates.map((point, index) => `${index ? 'L' : 'M'}${project(point).map(value => value.toFixed(2)).join(',')}`).join(' ') + (closed ? ' Z' : '')
  if (geometry.type === 'LineString') return line(geometry.coordinates)
  if (geometry.type === 'MultiLineString') return geometry.coordinates.map(points => line(points)).join(' ')
  if (geometry.type === 'Polygon') return geometry.coordinates.map(points => line(points, true)).join(' ')
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(polygon => polygon.map(points => line(points, true))).join(' ')
  return ''
}

function insideRing(point, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

export function insideBoundary(point, geometry) {
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
  return polygons.some(([outer, ...holes]) => insideRing(point, outer) && !holes.some(hole => insideRing(point, hole)))
}

export const rectanglesOverlap = (a, b, gap = 4) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y

// Labels move to make room; their geographic anchor never moves.
export function layoutLabels(pins, width, height, fontSize = 12) {
  const placed = []
  const ordered = [...pins].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  for (const pin of ordered) {
    const labelWidth = Math.min(width - 24, Math.max(56, pin.name.length * fontSize * .64 + (pin.context ? 12 : 22)))
    const labelHeight = pin.context ? 24 : 44
    const offsets = [[12, -22], [-labelWidth - 12, -22], [-labelWidth / 2, -54], [-labelWidth / 2, 12], [12, -72], [-labelWidth - 12, 34], [-labelWidth / 2, -110], [-labelWidth / 2, 68]]
    const clamp = ([dx, dy]) => ({ x: Math.max(10, Math.min(width - labelWidth - 10, pin.x + dx)), y: Math.max(38, Math.min(height - labelHeight - 30, pin.y + dy)), width: labelWidth, height: labelHeight })
    const candidates = offsets.map(clamp)
    // The fallback is useful on narrow displays and for adjacent villages.
    for (let y = 38; y < height - labelHeight - 28; y += 12) for (let x = 10; x < width - labelWidth; x += 16) candidates.push({ x, y, width: labelWidth, height: labelHeight })
    const valid = candidates.filter(rect => !placed.some(value => rectanglesOverlap(rect, value.rect)) && !pins.some(other => rectanglesOverlap(rect, { x: other.x - 5, y: other.y - 5, width: 10, height: 10 }, 2)))
    valid.sort((a, b) => Math.hypot(a.x + a.width / 2 - pin.x, a.y + a.height / 2 - pin.y) - Math.hypot(b.x + b.width / 2 - pin.x, b.y + b.height / 2 - pin.y))
    if (valid[0]) placed.push({ ...pin, rect: valid[0] })
  }
  return placed
}

export function scaleBar(projection, maximumWidth = 100) {
  const groundMetersPerPixel = Math.cos(projection.latitude * radians) / projection.scale
  const distances = [0.5, 1, 2, 5, 10, 20, 50, 100, 200]
  const kilometers = distances.filter(value => value * 1000 / groundMetersPerPixel <= maximumWidth).at(-1) ?? .5
  return { kilometers, width: kilometers * 1000 / groundMetersPerPixel }
}
