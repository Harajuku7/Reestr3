import test from "node:test"
import assert from "node:assert/strict"
import { catalogItems, filterCatalog } from "./catalog.mjs"

const base = { people: "all", category: "all", status: "all", query: "" }

test("фильтрует записи по народу", () => {
  const result = filterCatalog(catalogItems, { ...base, people: "teleut" })
  assert.ok(result.length > 0)
  assert.ok(result.every((item) => item.people === "teleut"))
})

test("совмещает категорию и статус", () => {
  const result = filterCatalog(catalogItems, { ...base, category: "rituals", status: "preserved" })
  assert.deepEqual(result.map((item) => item.title), ["Сибирское чаепитие"])
})

test("ищет без учета регистра", () => {
  const result = filterCatalog(catalogItems, { ...base, query: "КЕДРОВОГО" })
  assert.equal(result.length, 1)
})

test("возвращает пустой список для неизвестного запроса", () => {
  const result = filterCatalog(catalogItems, { ...base, query: "несуществующий объект" })
  assert.deepEqual(result, [])
})
