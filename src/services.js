export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body })
  const payload = await response.json().catch(() => ({ success: false, error: { message: 'The server returned an unreadable response.' } }))
  if (!response.ok) throw new Error(payload.error?.message || 'Something went wrong.')
  return payload.data
}
