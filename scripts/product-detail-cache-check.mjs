import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--short', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
  if (result.error) {
    blockers.push(`Could not inspect git status: ${result.error.message}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line)
    .map((line) => line.replaceAll('\\', '/'));
}

const paths = {
  cache: 'apps/tablet/src/composables/use-product-detail-cache.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  packageJson: 'package.json',
};

for (const relativePath of Object.values(paths)) {
  assert(existsSync(join(root, relativePath)), `${relativePath} should exist.`);
}

const cache = read(paths.cache);
const store = read(paths.store);
const packageJson = read(paths.packageJson);

assert(cache.includes('PRODUCT_DETAIL_CACHE_TTL_MS = 30_000'), 'Product detail cache TTL should be 30 seconds.');
assert(cache.includes('new Map<string, ProductDetailCacheEntry>()'), 'Product detail cache should use an in-memory Map.');
assert(cache.includes('promise?: Promise<ProductDrawingDetail>'), 'Product detail cache should track in-flight promises.');
assert(cache.includes('if (!options.force && entry?.promise) return entry.promise'), 'Product detail cache should deduplicate in-flight requests.');
assert(cache.includes('setProductDetailCache(detail)'), 'Successful detail fetches should populate the cache.');
assert(cache.includes('catch((error)'), 'Cache should handle failed fetches explicitly.');
assert(cache.includes('entries.delete(productId)'), 'Failed or invalidated entries should be removed instead of caching errors.');
assert(!/localStorage|sessionStorage|indexedDB|Blob|FileReader|createObjectURL|pdfjs|downloadUrl|previewUrl/i.test(cache), 'Product detail cache must not persist or cache files, blobs, PDF data, or preview URLs.');

assert(store.includes("import { createProductDetailCache } from '@/composables/use-product-detail-cache'"), 'Store should import the product detail cache.');
assert(store.includes('const productDetailCache = createProductDetailCache(getHubProductDetail)'), 'Store should wrap getHubProductDetail in the cache.');
assert(store.includes('async function loadProductDetail'), 'Store should expose a local loadProductDetail helper.');
assert(store.includes('productListRequests = new Map<string, Promise<HubProductModel[]>>()'), 'Store should deduplicate customer product list requests.');
assert(store.includes('orderRequests = new Map<OrderScope, Promise<ProductionOrder[]>>()'), 'Store should deduplicate order list requests.');
assert(store.includes('orderCache = new Map<OrderScope'), 'Store should keep a short order cache.');
assert(store.includes('ORDER_CACHE_TTL_MS = 10_000'), 'Order cache should use the V3.16 native short-lived 10s TTL.');
assert(store.includes('invalidateOrderCache()'), 'Order writes should invalidate the short order cache.');
assert(store.includes('loadOrdersForScope'), 'Order list loads should go through the scoped cache helper.');
assert(store.includes('await loadProductDetail(linkedProductId)'), 'Opening an already-linked order should use the cached product detail loader.');
assert(store.includes('await openProduct(detail.product, source, { detail })'), 'Opening an already-linked order should not fetch the same product detail twice.');
assert(store.includes('options: { skipRoute?: boolean; detail?: ProductDrawingDetail; forceRefresh?: boolean }'), 'openProduct should accept a preloaded detail for dedupe.');
assert(store.includes('options.detail ?? await loadProductDetail'), 'openProduct should reuse preloaded detail or use the cached loader.');
assert(store.includes('loadProductDetail(productId, { force: true })'), 'Upload validation should force-refresh product detail.');
assert(store.includes('affectedProductIds.forEach((productId) => invalidateProductDetail(productId))'), 'PDF apply should invalidate affected product detail cache entries.');
assert(store.includes('rememberProductDetail(response.detail)'), 'Upload and lifecycle responses should repopulate the product detail cache.');
assert(store.includes('invalidateProductDetail(product.productId)'), 'Product create/update should invalidate the product detail cache.');

const directProductDetailCalls = (store.match(/getHubProductDetail\(/g) ?? []).length;
assert(directProductDetailCalls === 0, `Store should not directly call getHubProductDetail outside the cache wrapper; found ${directProductDetailCalls}.`);
assert(store.includes('createProductDetailCache(getHubProductDetail)'), 'Store should pass getHubProductDetail into the cache wrapper.');
const directProductListCalls = (store.match(/getHubProducts\(/g) ?? []).length;
assert(directProductListCalls === 1, `Store should call getHubProducts only through loadProductsForCustomer; found ${directProductListCalls}.`);
assert(!/new\s+PrismaClient|DATABASE_URL|db push|migrate|Sealos/i.test(cache + store), 'Cache changes must not connect to database or Sealos.');
assert(packageJson.includes('"product-detail-cache:check": "node scripts/product-detail-cache-check.mjs"'), 'Root package.json should expose product-detail-cache:check.');

const changed = changedFiles();
assert(!changed.some((file) => file.startsWith('apps/api/')), 'This frontend cache step must not modify backend files.');
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'This cache step must not modify Prisma schema.');
assert(!changed.some((file) => /storage\/(metadata|uploads|tmp)\//.test(file)), 'Runtime storage files must not be changed.');

if (blockers.length) {
  console.error('Product detail cache check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Product detail cache check passed.');
