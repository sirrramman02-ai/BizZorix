export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body })
  } catch {
    throw new Error(import.meta.env.PROD
      ? 'BizZorix could not reach the deployed API. Please try again shortly or contact the administrator.'
      : 'BizZorix could not reach the server. Start the app with “npm run dev” and try again.')
  }
  const payload = await response.json().catch(() => ({ success: false, error: { message: 'The server returned an unreadable response.' } }))
  if (!response.ok) throw new Error(payload.error?.message || 'Something went wrong.')
  return payload.data
}
