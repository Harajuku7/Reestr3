// Retry a failed image once, without changing its URL or bypassing the cache.
// Unloaded tiles must not start a delayed request for an obsolete map view.
export function tileRetry(done, retry, { schedule = setTimeout, cancel = clearTimeout, delay = 700 } = {}) {
  let retried = false
  let timer = null
  let disposed = false
  let settled = false
  return {
    complete(error, tile) {
      if (disposed || settled) return
      if (error && !retried) {
        retried = true
        timer = schedule(() => { timer = null; if (!disposed && !settled) retry(tile) }, delay)
        return
      }
      settled = true
      if (timer !== null) cancel(timer)
      timer = null
      done(error, tile)
    },
    dispose() {
      disposed = true
      if (timer !== null) cancel(timer)
      timer = null
    },
  }
}

// Only the current zoom and tiles intersecting the visible map affect the notice.
// A failure from an old zoom or a panned-away tile is not a current failure.
export function tileCoverage(tiles, zoom, viewport) {
  const result = { loaded: 0, failed: 0, pending: 0 }
  for (const tile of tiles) {
    const rect = tile.rect
    if (tile.zoom !== Math.round(zoom) || rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue
    if (tile.state in result) result[tile.state]++
  }
  return result
}
