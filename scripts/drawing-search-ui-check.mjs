import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const api = readFileSync(join(root, 'apps/tablet/src/services/api.ts'), 'utf8')
const store = readFileSync(join(root, 'apps/tablet/src/stores/document-hub-store.ts'), 'utf8')
const types = readFileSync(join(root, 'apps/tablet/src/types/drawing-search.ts'), 'utf8')
const searchBar = readFileSync(join(root, 'apps/tablet/src/components/hub/WarmHubSearchBar.vue'), 'utf8')
const results = readFileSync(join(root, 'apps/tablet/src/components/search/WarmDrawingSearchResults.vue'), 'utf8')
const item = readFileSync(join(root, 'apps/tablet/src/components/search/WarmDrawingSearchResultItem.vue'), 'utf8')

function assert(condition, message) {
  if (!condition) {
    console.error(`[drawing-search-ui] ${message}`)
    process.exit(1)
  }
}

assert(types.includes('DrawingCustomerSearchResult') && types.includes('DrawingProductSearchResult') && types.includes('DrawingDocumentSearchResult'), 'drawing search result types are incomplete')
assert(api.includes('searchDocumentHub') && api.includes('URLSearchParams'), 'real API search must use URLSearchParams')
assert(!api.match(/searchDocumentHub[\s\S]{0,400}mock/i), 'search API must not use mock fallback')
assert(store.includes('searchQuery') && store.includes('searchMode') && store.includes('searchResults') && store.includes('searchGroupedResults'), 'store search state is incomplete')
assert(store.includes('searchRequestSequence'), 'old request overwrite protection is missing')
assert(store.includes('setTimeout') && store.includes('320'), 'debounced drawing search is missing')
assert(store.includes('executeScopedSearch') && store.includes('openSearchResult') && store.includes('refreshSearchAfterWrite'), 'store search actions are missing')
assert(store.includes('searchDocumentHub(\'drawing\''), 'store must call real drawing search API')
assert(store.includes('result.resultType === \'customer\'') && store.includes('result.resultType === \'product\'') && store.includes('result.resultType === \'document\''), 'customer/product/document navigation is missing')
assert(store.includes('openModuleViewer(module, item'), 'document search result must open the viewer')
assert(store.includes('searchOpen') && searchBar.includes('WarmDrawingSearchResults'), 'search result panel is not wired to top search bar')
assert(searchBar.includes('@keydown.esc.prevent') && searchBar.includes('@submit.prevent') && searchBar.includes('pointerdown'), 'keyboard and outside-click behavior is missing')
assert(results.includes('客户') && results.includes('产品型号') && results.includes('资料'), 'group labels are missing')
assert(results.includes('正在查询资料') && results.includes('未找到相关客户') && results.includes('资料查询失败'), 'loading/empty/error states are missing')
assert(item.includes('已有图纸') && item.includes('资料不完整') && item.includes('未发图'), 'drawing status labels are missing')
assert(!results.includes('最近搜索') && !searchBar.includes('最近搜索') && !store.includes('recentSearch'), 'recent search UI/state must not be added')
assert(!store.includes('localStorage.setItem') && !store.includes('localStorage.getItem'), 'drawing search state must not be persisted to localStorage')

console.log('[drawing-search-ui] ok')
