// Only anchors owned by the catalog participate in history restoration.
// Hash navigation must not be overwritten by the saved scroll position.
const catalogAnchors = new Set([
  'main', 'results-heading', 'record-description', 'record-media',
  'record-facts', 'record-related', 'record-sources',
])

export function catalogScrollTarget(hash, savedScroll = 0) {
  const id = typeof hash === 'string' ? hash.slice(1) : ''
  if (typeof hash === 'string' && hash.startsWith('#') && catalogAnchors.has(id)) return { id }
  return { top: Number.isFinite(savedScroll) && savedScroll >= 0 ? savedScroll : 0 }
}
