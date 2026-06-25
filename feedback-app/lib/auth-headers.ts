/**
 * Returns authentication headers pre-configured with the WESHUTTLE_INTERNAL_KEY.
 * Merges any additional headers provided.
 */
export function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders }
  const internalKey = process.env.WESHUTTLE_INTERNAL_KEY
  if (internalKey) {
    headers['Authorization'] = `Bearer ${internalKey}`
  }
  return headers
}
