const tabletUrl = process.env.TABLET_PREVIEW_URL
const apiHealthUrl = process.env.API_HEALTH_URL

async function check(url, label) {
  const started = performance.now()
  const response = await fetch(url, { redirect: 'manual' })
  const elapsed = Math.round(performance.now() - started)
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${label} returned HTTP ${response.status}`)
  }
  return `${label}: HTTP ${response.status}, ${elapsed}ms`
}

if (!tabletUrl && !apiHealthUrl) {
  console.log('Tablet production smoke skipped: TABLET_PREVIEW_URL/API_HEALTH_URL not provided.')
  process.exit(0)
}

const results = []
try {
  if (tabletUrl) results.push(await check(tabletUrl, 'Tablet preview'))
  if (apiHealthUrl) results.push(await check(apiHealthUrl, 'API health'))
  console.log(results.join('\n'))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
