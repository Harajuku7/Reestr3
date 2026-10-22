// No geocoder, account, location permission or prefetch is used by the viewer.
export const mapSettings = Object.freeze({
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  minZoom: 6,
  maxZoom: 18,
  zoomSnap: .25,
  zoomDelta: .5,
  wheelPxPerZoomLevel: 100,
  wheelDebounceTime: 30,
  scrollWheelZoom: true,
  touchZoom: true,
  doubleClickZoom: true,
  keyboard: true,
  maxBounds: [[51.5, 83.5], [57.5, 91]],
  maxBoundsViscosity: .8,
})

export const selectedPlaces = (places, group) => places.filter(place => group === 'all' || place.properties.people.includes(group))
export const placeLatLng = place => [place.geometry.coordinates[1], place.geometry.coordinates[0]]
export const shouldClusterTeleuts = (zoom, group = 'all') => group === 'all' && zoom < 11.5
