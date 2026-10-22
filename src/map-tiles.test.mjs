import test from 'node:test'
import assert from 'node:assert/strict'
import { tileRetry, tileCoverage } from './map-tiles.mjs'

test('a transient tile failure retries once, then reports success', () => {
  let scheduled, retries = 0
  const completed = []
  const tile = {}
  const attempt = tileRetry((error, value) => completed.push([error, value]), value => { assert.equal(value, tile); retries++ }, { schedule: callback => { scheduled = callback; return 1 } })
  attempt.complete(new Error('transient network failure'), tile)
  assert.equal(completed.length, 0)
  scheduled()
  assert.equal(retries, 1)
  attempt.complete(null, tile)
  assert.deepEqual(completed, [[null, tile]])
})

test('a persistent tile failure stops after one retry and remains reportable', () => {
  let scheduled, retries = 0
  const completed = []
  const failure = new Error('offline')
  const attempt = tileRetry(error => completed.push(error), () => retries++, { schedule: callback => { scheduled = callback; return 1 } })
  attempt.complete(failure, {})
  scheduled()
  attempt.complete(failure, {})
  assert.equal(retries, 1)
  assert.deepEqual(completed, [failure])
})

test('unloaded tiles cancel delayed retries and ignore late events', () => {
  let scheduled, cancelled, retries = 0, completed = 0
  const attempt = tileRetry(() => completed++, () => retries++, { schedule: callback => { scheduled = callback; return 12 }, cancel: timer => { cancelled = timer } })
  attempt.complete(new Error('offline'), {})
  attempt.dispose()
  scheduled()
  attempt.complete(null, {})
  assert.equal(cancelled, 12)
  assert.equal(retries, 0)
  assert.equal(completed, 0)
})

test('late success cancels a scheduled retry and final completion is idempotent', () => {
  let scheduled, cancelled, retries = 0, completed = 0
  const attempt = tileRetry(() => completed++, () => retries++, { schedule: callback => { scheduled = callback; return 7 }, cancel: timer => { cancelled = timer } })
  attempt.complete(new Error('first failure'), {})
  attempt.complete(null, {})
  assert.equal(cancelled, 7)
  attempt.complete(null, {})
  assert.equal(completed, 1)
  // A cancelled callback must not issue work even if delivered by a test scheduler.
  scheduled()
  assert.equal(retries, 0)
})

test('error notice follows the current visible tiles, not historic failures', () => {
  const viewport = { left: 0, top: 0, right: 320, bottom: 500 }
  const rect = { left: 0, top: 0, right: 256, bottom: 256 }
  const tiles = [
    { zoom: 8, state: 'failed', rect },
    { zoom: 9, state: 'loaded', rect },
    { zoom: 9, state: 'failed', rect: { left: 400, top: 0, right: 656, bottom: 256 } },
  ]
  assert.deepEqual(tileCoverage(tiles, 9.25, viewport), { loaded: 1, failed: 0, pending: 0 })
  tiles.push({ zoom: 9, state: 'failed', rect })
  assert.equal(tileCoverage(tiles, 9.25, viewport).failed, 1)
  tiles.at(-1).state = 'loaded'
  assert.deepEqual(tileCoverage(tiles, 9.25, viewport), { loaded: 2, failed: 0, pending: 0 })
  tiles.push({ zoom: 9, state: 'pending', rect })
  assert.equal(tileCoverage(tiles, 9.25, viewport).pending, 1)
})
