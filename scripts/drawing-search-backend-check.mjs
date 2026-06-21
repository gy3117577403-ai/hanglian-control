import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const service = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.service.ts'), 'utf8')
const controller = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.controller.ts'), 'utf8')
const dto = readFileSync(join(root, 'apps/api/src/document-hub/dto/drawing-search.dto.ts'), 'utf8')

function assert(condition, message) {
  if (!condition) {
    console.error(`[drawing-search-backend] ${message}`)
    process.exit(1)
  }
}

assert(controller.includes("@Get('search')"), 'missing unified /document-hub/search route')
assert(controller.includes('DrawingSearchQueryDto'), 'search route must use DrawingSearchQueryDto')
assert(dto.includes("mode!: 'drawing' | 'connector' | 'fixture'"), 'mode isolation dto is missing')
assert(dto.includes('limit?'), 'search limit query is missing')
assert(service.includes('searchDrawings'), 'drawing search implementation is missing')
assert(service.includes('normalizeSearchQuery') && service.includes('normalizeSearchProductModel'), 'query normalization is missing')
assert(service.includes('return { mode: \'drawing\', query: \'\', total: 0'), 'blank drawing query must return empty results')
assert(service.includes('Math.min(100'), 'limit must be capped at 100')
assert(service.includes('scoreProductSearch') && service.includes('1000') && service.includes('900'), 'exact and prefix product model ranking is missing')
assert(service.includes('scoreCustomerSearch') && service.includes('scoreDocumentSearch'), 'customer/document ranking is missing')
assert(service.includes('readCustomers()') && service.includes('readProducts()') && service.includes('withUploadedDocuments'), 'search must include customers, products and uploaded documents')
assert(service.includes('isSoftDeletedEntity(customer)') && service.includes('isSoftDeletedEntity(product)') && service.includes('isSoftDeletedEntity(item)'), 'soft-deleted entities must be excluded')
assert(service.includes('seenCustomers') && service.includes('seenProducts') && service.includes('seenDocuments'), 'dedupe by customer/product/document is missing')
assert(service.includes("if (mode === 'connector')") && service.includes("if (mode === 'fixture')"), 'connector/fixture mode isolation is missing')

const searchRegion = service.slice(service.indexOf('async search('), service.indexOf('private requireOrderStore'))
for (const forbidden of ['storageKey', 'absolutePath', 'checksumSha256', 'passwordHash', 'metadataPath', 'stagedFileKey']) {
  assert(!searchRegion.includes(`${forbidden}:`), `search response must not expose ${forbidden}`)
}

console.log('[drawing-search-backend] ok')
