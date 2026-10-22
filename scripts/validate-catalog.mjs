import { stat } from 'node:fs/promises'
import { registryRecords, safeMediaUrl, validateCatalog } from '../src/catalog.mjs'

const errors = validateCatalog(registryRecords)
for (const item of registryRecords) {
  for (const media of Array.isArray(item?.media) ? item.media : []) {
    if (!safeMediaUrl(media?.src)) continue
    try {
      const info = await stat(new URL(`../public/${media.src}`, import.meta.url))
      if (!info.isFile() || !info.size) errors.push(`Пустой медиафайл: ${item.code} / ${media.src}`)
    } catch { errors.push(`Медиафайл не найден: ${item.code} / ${media.src}`) }
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Каталог проверен: ${registryRecords.filter(item => item.type === 'heritage').length} записей наследия, ${registryRecords.filter(item => item.type === 'museum').length} предмета, ${registryRecords.reduce((sum, item) => sum + item.media.length, 0)} медиафайлов. Связи и классификаторы корректны.`)
}
