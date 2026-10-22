import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogScrollTarget } from './catalog-navigation.mjs'

test('passport anchor wins over saved scroll from catalog history', () => {
  for (const id of ['record-description', 'record-media', 'record-facts', 'record-related', 'record-sources']) {
    assert.deepEqual(catalogScrollTarget(`#${id}`, 0), { id })
    assert.deepEqual(catalogScrollTarget(`#${id}`, 780), { id })
  }
})

test('return to results and skip link remain valid anchor targets', () => {
  assert.deepEqual(catalogScrollTarget('#results-heading'), { id: 'results-heading' })
  assert.deepEqual(catalogScrollTarget('#main'), { id: 'main' })
})

test('non-anchor history entries restore a finite non-negative position', () => {
  assert.deepEqual(catalogScrollTarget('', 783), { top: 783 })
  for (const position of [undefined, null, -1, Infinity, NaN, '200']) {
    assert.deepEqual(catalogScrollTarget('#unknown', position), { top: 0 })
  }
  assert.deepEqual(catalogScrollTarget('#record-media<script>', 64), { top: 64 })
})
