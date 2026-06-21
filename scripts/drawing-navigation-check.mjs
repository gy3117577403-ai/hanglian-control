import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const routes = readFileSync(join(root, 'apps/tablet/src/app/routes.ts'), 'utf8')
const routeLib = readFileSync(join(root, 'apps/tablet/src/lib/drawing-routes.ts'), 'utf8')
const store = readFileSync(join(root, 'apps/tablet/src/stores/document-hub-store.ts'), 'utf8')
const navStore = readFileSync(join(root, 'apps/tablet/src/stores/drawing-navigation-store.ts'), 'utf8')
const dashboard = readFileSync(join(root, 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue'), 'utf8')

function assert(condition, message) {
  if (!condition) {
    console.error(`[drawing-navigation] ${message}`)
    process.exit(1)
  }
}

assert(routes.includes('/tablet/drawings/customers/:customerId'), 'customer stable route is missing')
assert(routes.includes('/tablet/drawings/products/:productId'), 'product stable route is missing')
assert(routes.includes('/tablet/drawings/products/:productId/modules/:moduleKey'), 'module stable route is missing')
assert(routes.includes('/tablet/drawings/products/:productId/modules/:moduleKey/items/:itemId'), 'document deep link route is missing')
assert(routeLib.includes('encodeURIComponent'), 'route params must be encoded')
assert(routeLib.includes('missing-') && routeLib.includes('mock-') && routeLib.includes('orderId'), 'unsafe route id protection is missing')
assert(store.includes('restoreDrawingRouteFromCurrentUrl'), 'route restore action is missing')
assert(store.includes('hydrateProductFromRoute') && (store.includes('getHubProductDetail(productId)') || store.includes('loadProductDetail(productId)')), 'product URL refresh restore is missing')
assert(store.includes('openCustomer(customer, { skipRoute: true') && store.includes('openModule(module, { skipRoute: true') && store.includes('openModuleViewer(module, item, { skipRoute: true'), 'route restore must not loop through router pushes')
assert(store.includes('drawingProductRoute') && store.includes('drawingModuleRoute') && store.includes('drawingItemRoute') && store.includes('drawingCustomerRoute'), 'store is not wired to drawing routes')
assert(store.includes('navigateDrawingPath') && store.includes('router.push') && store.includes('router.replace'), 'browser navigation support is missing')
assert(dashboard.includes('watch(() => route.fullPath') && dashboard.includes('restoreDrawingRouteFromCurrentUrl'), 'dashboard must react to browser back/forward')
assert(navStore.includes('order') && navStore.includes('search') && navStore.includes('customer_maintenance') && navStore.includes('pdf_import_result'), 'navigation source memory is incomplete')
assert(navStore.includes('searchResultScrollTop') && navStore.includes('orderListScrollTop') && navStore.includes('maintenanceProductScrollTop'), 'scroll position memory is incomplete')
assert(!navStore.includes('localStorage'), 'navigation memory must remain session-only')
assert(!store.includes('/connectors/') && !store.includes('/fixtures/'), 'drawing navigation must not modify connector/fixture routes')

console.log('[drawing-navigation] ok')
