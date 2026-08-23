import { Business, Match, ProductService } from './models.js'

const stopWords = new Set(['the', 'and', 'for', 'with', 'need', 'around', 'from', 'this', 'that', 'want', 'please', 'delivered'])
export const keywordsFrom = (text) => [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)))]

export async function matchRequest(request) {
  const businesses = await Business.find({ verificationStatus: 'verified' })
  const records = []
  for (const business of businesses) {
    const items = await ProductService.find({ businessId: business.id, isPublished: true })
    let score = 0
    const reasons = []
    if (business.mainCategory === request.category) { score += 35; reasons.push('Exact category match') }
    const terms = `${business.name} ${business.description || ''} ${business.serviceTags.join(' ')} ${items.map((item) => `${item.name} ${item.tags.join(' ')}`).join(' ')}`.toLowerCase()
    const overlaps = request.keywords.filter((word) => terms.includes(word)).length
    if (overlaps) { const points = Math.min(30, overlaps * 10); score += points; reasons.push(`${overlaps} service keyword${overlaps > 1 ? 's' : ''} matched`) }
    if (business.area === request.area) { score += 20; reasons.push('Located in the same area') }
    if (business.serviceAreas.includes(request.area)) { score += 10; reasons.push('Serves your area') }
    score += 5; reasons.push('Currently accepting requests')
    if (score >= 45) records.push({ requestId: request.id, businessId: business.id, score: Math.min(score, 100), reasons, status: 'suggested' })
  }
  if (records.length) await Match.bulkWrite(records.map((record) => ({ updateOne: { filter: { requestId: record.requestId, businessId: record.businessId }, update: { $set: record }, upsert: true } })))
  return records
}
