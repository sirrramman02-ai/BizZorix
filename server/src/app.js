import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { allowRoles, requireAuth, safeUser, setAuthCookie } from './auth.js'
import { Area, Business, Category, Conversation, CustomerRequest, Flag, Match, Message, Notification, ProductService, Promotion, Quotation, Review, SavedBusiness, User } from './models.js'
import { keywordsFrom, matchRequest } from './matching.js'

export const app = express()
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80 }))

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data })
const fail = (res, status, message) => res.status(status).json({ success: false, error: { message } })
const pageMeta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) })
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const ownsBusiness = async (userId) => Business.findOne({ ownerId: userId })

const registerSchema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(8), phone: z.string().optional(), preferredArea: z.string().optional(), businessName: z.string().optional(), category: z.string().optional(), area: z.string().optional() })

app.post('/api/auth/register/:type', asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message)
  if (!['customer', 'business'].includes(req.params.type)) return fail(res, 400, 'Invalid account type.')
  if (await User.exists({ email: parsed.data.email.toLowerCase() })) return fail(res, 409, 'An account with this email already exists.')
  const user = await User.create({ fullName: parsed.data.fullName, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12), optionalPhone: parsed.data.phone, preferredArea: parsed.data.preferredArea || parsed.data.area, role: req.params.type })
  if (user.role === 'business') await Business.create({ ownerId: user.id, name: parsed.data.businessName || `${user.fullName}'s Business`, slug: `${(parsed.data.businessName || user.fullName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`, mainCategory: parsed.data.category || 'Other', publicPhone: parsed.data.phone, area: parsed.data.area, serviceAreas: [parsed.data.area].filter(Boolean), serviceTags: [] })
  setAuthCookie(res, user)
  ok(res, safeUser(user), 201)
}))

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return fail(res, 401, 'Email or password is incorrect.')
  if (user.status !== 'active') return fail(res, 403, 'This account is suspended.')
  setAuthCookie(res, user); ok(res, safeUser(user))
}))
app.post('/api/auth/logout', (req, res) => { res.clearCookie('bizzorix_session'); ok(res, null) })
app.get('/api/auth/me', requireAuth, (req, res) => ok(res, safeUser(req.user)))

app.get('/api/categories', asyncRoute(async (_req, res) => ok(res, await Category.find({ active: true }).sort({ order: 1, name: 1 }))))
app.get('/api/areas', asyncRoute(async (_req, res) => ok(res, await Area.find({ active: true }).sort({ name: 1 }))))
app.get('/api/businesses', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(30, Number(req.query.limit) || 12)
  const filter = { verificationStatus: 'verified' }
  if (req.query.category) filter.mainCategory = req.query.category
  if (req.query.area) filter.$or = [{ area: req.query.area }, { serviceAreas: req.query.area }]
  if (req.query.rating) filter.averageRating = { $gte: Number(req.query.rating) }
  if (req.query.q) filter.$text = { $search: String(req.query.q) }
  const sort = req.query.sort === 'rating' ? { averageRating: -1 } : { isFeatured: -1, averageRating: -1 }
  const [businesses, total] = await Promise.all([Business.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(), Business.countDocuments(filter)])
  const ids = businesses.map((business) => business._id)
  const items = await ProductService.find({ businessId: { $in: ids }, isPublished: true }).lean()
  ok(res, { businesses: businesses.map((business) => ({ ...business, items: items.filter((item) => String(item.businessId) === String(business._id)).slice(0, 3) })), pagination: pageMeta(page, limit, total) })
}))
app.get('/api/businesses/me', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => ok(res, await Business.findOne({ ownerId: req.user.id }))))
app.patch('/api/businesses/me', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => {
  const allowed = ['name', 'description', 'mainCategory', 'subcategories', 'logo', 'coverImage', 'gallery', 'publicPhone', 'publicEmail', 'whatsappEnabled', 'area', 'addressDescription', 'serviceAreas', 'serviceTags', 'openingHours', 'contactPreferences']
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)))
  ok(res, await Business.findOneAndUpdate({ ownerId: req.user.id }, update, { new: true, runValidators: true }))
}))
app.post('/api/businesses/me/submit-verification', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => ok(res, await Business.findOneAndUpdate({ ownerId: req.user.id }, { verificationStatus: 'pending', verificationNotes: '' }, { new: true }))))
app.get('/api/businesses/:slug', asyncRoute(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug, verificationStatus: 'verified' }).lean()
  if (!business) return fail(res, 404, 'Business not found.')
  const [items, reviews, promotions] = await Promise.all([ProductService.find({ businessId: business._id, isPublished: true }), Review.find({ businessId: business._id, status: 'approved' }).populate('customerId', 'fullName').sort({ createdAt: -1 }), Promotion.find({ businessId: business._id, status: 'active', endDate: { $gte: new Date() } })])
  ok(res, { ...business, items, reviews, promotions })
}))
app.post('/api/businesses/:id/view', asyncRoute(async (req, res) => { await Business.updateOne({ _id: req.params.id }, { $inc: { profileViews: 1 } }); ok(res, null) }))
app.post('/api/businesses/:id/save', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => ok(res, await SavedBusiness.findOneAndUpdate({ customerId: req.user.id, businessId: req.params.id }, {}, { upsert: true, new: true }), 201)))
app.delete('/api/businesses/:id/save', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { await SavedBusiness.deleteOne({ customerId: req.user.id, businessId: req.params.id }); ok(res, null) }))
app.get('/api/saved-businesses', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => ok(res, await SavedBusiness.find({ customerId: req.user.id }).populate('businessId'))))

app.get('/api/businesses/:id/items', asyncRoute(async (req, res) => ok(res, await ProductService.find({ businessId: req.params.id, isPublished: true }))))
app.post('/api/business-items', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => { const business = await ownsBusiness(req.user.id); ok(res, await ProductService.create({ ...req.body, businessId: business.id }), 201) }))
app.patch('/api/business-items/:id', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => { const business = await ownsBusiness(req.user.id); const item = await ProductService.findOneAndUpdate({ _id: req.params.id, businessId: business.id }, req.body, { new: true, runValidators: true }); if (!item) return fail(res, 404, 'Item not found.'); ok(res, item) }))
app.delete('/api/business-items/:id', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => { const business = await ownsBusiness(req.user.id); await ProductService.deleteOne({ _id: req.params.id, businessId: business.id }); ok(res, null) }))

app.post('/api/requests', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => {
  const schema = z.object({ title: z.string().min(8).max(120), description: z.string().min(20).max(2000), category: z.string().min(2), area: z.string().min(2), locationNote: z.string().max(200).optional(), budgetType: z.enum(['fixed', 'range', 'open']), budgetAmount: z.coerce.number().positive().optional(), minBudget: z.coerce.number().positive().optional(), maxBudget: z.coerce.number().positive().optional(), neededBy: z.string().optional(), urgency: z.string().optional() })
  const parsed = schema.safeParse(req.body); if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message)
  const request = await CustomerRequest.create({ ...parsed.data, neededBy: parsed.data.neededBy || undefined, customerId: req.user.id, keywords: keywordsFrom(`${parsed.data.title} ${parsed.data.description}`) })
  const matches = await matchRequest(request)
  if (matches.length) { request.status = 'matched'; await request.save(); await Notification.create({ userId: req.user.id, type: 'matches', title: 'Businesses matched', body: `We found ${matches.length} suitable ${matches.length === 1 ? 'business' : 'businesses'} for your request.`, link: `/requests/${request.id}/offers` }) }
  ok(res, { request, matches }, 201)
}))
app.get('/api/requests/mine', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => ok(res, await CustomerRequest.find({ customerId: req.user.id }).sort({ createdAt: -1 }))))
app.get('/api/requests/:id', requireAuth, asyncRoute(async (req, res) => { const request = await CustomerRequest.findById(req.params.id); if (!request) return fail(res, 404, 'Request not found.'); const business = req.user.role === 'business' ? await ownsBusiness(req.user.id) : null; if (String(request.customerId) !== req.user.id && !(business && await Match.exists({ requestId: request.id, businessId: business.id }))) return fail(res, 403, 'You do not have permission to view this request.'); ok(res, request) }))
app.patch('/api/requests/:id', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { const request = await CustomerRequest.findOne({ _id: req.params.id, customerId: req.user.id, status: { $in: ['open', 'matched', 'offers_received'] } }); if (!request) return fail(res, 404, 'This request can no longer be edited.'); Object.assign(request, req.body, { keywords: keywordsFrom(`${req.body.title || request.title} ${req.body.description || request.description}`) }); await request.save(); await matchRequest(request); ok(res, request) }))
app.post('/api/requests/:id/cancel', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { const request = await CustomerRequest.findOneAndUpdate({ _id: req.params.id, customerId: req.user.id, status: { $nin: ['completed', 'cancelled'] } }, { status: 'cancelled' }, { new: true }); if (!request) return fail(res, 409, 'This request cannot be cancelled.'); await Quotation.updateMany({ requestId: request.id, status: { $in: ['sent', 'viewed'] } }, { status: 'cancelled' }); ok(res, request) }))
app.get('/api/requests/:id/matches', requireAuth, asyncRoute(async (req, res) => ok(res, await Match.find({ requestId: req.params.id }).populate('businessId'))))
app.get('/api/requests/:id/quotations', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { if (!await CustomerRequest.exists({ _id: req.params.id, customerId: req.user.id })) return fail(res, 403, 'You do not own this request.'); ok(res, await Quotation.find({ requestId: req.params.id }).populate('businessId')) }))

app.get('/api/business-dashboard/matched-requests', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => { const business = await ownsBusiness(req.user.id); ok(res, await Match.find({ businessId: business.id, status: { $nin: ['dismissed', 'expired'] } }).populate('requestId').sort({ score: -1 })) }))
app.post('/api/matches/:id/dismiss', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => { const business = await ownsBusiness(req.user.id); ok(res, await Match.findOneAndUpdate({ _id: req.params.id, businessId: business.id }, { status: 'dismissed' }, { new: true })) }))
app.post('/api/requests/:id/quotations', requireAuth, allowRoles('business'), asyncRoute(async (req, res) => {
  const business = await ownsBusiness(req.user.id); const request = await CustomerRequest.findById(req.params.id)
  if (!request || !await Match.exists({ requestId: request.id, businessId: business.id })) return fail(res, 403, 'Only a matched business can quote this request.')
  if (await Quotation.exists({ requestId: request.id, businessId: business.id, status: { $in: ['sent', 'viewed'] } })) return fail(res, 409, 'You already have an active quotation for this request.')
  const quote = await Quotation.create({ ...req.body, requestId: request.id, businessId: business.id, customerId: request.customerId })
  request.status = 'offers_received'; await request.save(); await Match.updateOne({ requestId: request.id, businessId: business.id }, { status: 'quoted' })
  await Notification.create({ userId: request.customerId, type: 'quotation', title: 'New quotation received', body: `${business.name} sent an offer for your request.`, link: `/requests/${request.id}/offers` })
  ok(res, quote, 201)
}))
app.get('/api/quotations/mine', requireAuth, asyncRoute(async (req, res) => { const filter = req.user.role === 'customer' ? { customerId: req.user.id } : { businessId: (await ownsBusiness(req.user.id)).id }; ok(res, await Quotation.find(filter).populate('businessId requestId').sort({ createdAt: -1 })) }))
app.post('/api/quotations/:id/accept', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => {
  const quote = await Quotation.findOne({ _id: req.params.id, customerId: req.user.id, status: { $in: ['sent', 'viewed'] } }); if (!quote) return fail(res, 409, 'This offer is no longer available.')
  await Quotation.updateMany({ requestId: quote.requestId, _id: { $ne: quote.id }, status: { $in: ['sent', 'viewed'] } }, { status: 'declined' }); quote.status = 'accepted'; await quote.save()
  const request = await CustomerRequest.findByIdAndUpdate(quote.requestId, { status: 'in_progress', acceptedQuotationId: quote.id }, { new: true })
  const business = await Business.findById(quote.businessId); await Notification.create({ userId: business.ownerId, type: 'accepted', title: 'Your quotation was accepted', body: 'The customer chose your offer. You can now coordinate the work.', link: '/business-dashboard' })
  await Conversation.findOneAndUpdate({ requestId: quote.requestId, businessId: quote.businessId }, { customerId: req.user.id, quotationId: quote.id }, { upsert: true, new: true })
  ok(res, { quotation: quote, request })
}))
app.post('/api/quotations/:id/decline', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { const quote = await Quotation.findOneAndUpdate({ _id: req.params.id, customerId: req.user.id, status: { $in: ['sent', 'viewed'] } }, { status: 'declined' }, { new: true }); if (!quote) return fail(res, 409, 'This offer is no longer available.'); ok(res, quote) }))
app.post('/api/requests/:id/complete', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { const request = await CustomerRequest.findOneAndUpdate({ _id: req.params.id, customerId: req.user.id, status: 'in_progress' }, { status: 'completed' }, { new: true }); if (!request) return fail(res, 409, 'Only an in-progress request can be completed.'); await Quotation.updateOne({ _id: request.acceptedQuotationId }, { status: 'completed' }); ok(res, request) }))

app.get('/api/conversations', requireAuth, asyncRoute(async (req, res) => { const business = req.user.role === 'business' ? await ownsBusiness(req.user.id) : null; ok(res, await Conversation.find(req.user.role === 'business' ? { businessId: business.id } : { customerId: req.user.id }).populate('customerId', 'fullName').populate('businessId', 'name logo')) }))
app.get('/api/conversations/:id/messages', requireAuth, asyncRoute(async (req, res) => { const conversation = await Conversation.findById(req.params.id).populate('businessId'); if (!conversation || (String(conversation.customerId) !== req.user.id && String(conversation.businessId.ownerId) !== req.user.id)) return fail(res, 403, 'You cannot access this conversation.'); ok(res, await Message.find({ conversationId: conversation.id }).sort({ createdAt: 1 })) }))
app.post('/api/conversations/:id/messages', requireAuth, rateLimit({ windowMs: 60000, limit: 30 }), asyncRoute(async (req, res) => { const conversation = await Conversation.findById(req.params.id).populate('businessId'); if (!conversation || (String(conversation.customerId) !== req.user.id && String(conversation.businessId.ownerId) !== req.user.id)) return fail(res, 403, 'You cannot access this conversation.'); const body = String(req.body.body || '').trim(); if (!body || body.length > 2000) return fail(res, 400, 'Message must be between 1 and 2,000 characters.'); ok(res, await Message.create({ conversationId: conversation.id, senderId: req.user.id, body }), 201) }))
app.get('/api/notifications', requireAuth, asyncRoute(async (req, res) => ok(res, await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50))))
app.patch('/api/notifications/read-all', requireAuth, asyncRoute(async (req, res) => { await Notification.updateMany({ userId: req.user.id, readAt: null }, { readAt: new Date() }); ok(res, null) }))
app.patch('/api/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => ok(res, await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { readAt: new Date() }, { new: true }))))
app.post('/api/reviews', requireAuth, allowRoles('customer'), asyncRoute(async (req, res) => { const request = await CustomerRequest.findOne({ _id: req.body.requestId, customerId: req.user.id, status: 'completed' }); if (!request) return fail(res, 403, 'Complete the request before leaving a review.'); if (await Review.exists({ requestId: request.id })) return fail(res, 409, 'You already reviewed this request.'); const quote = await Quotation.findById(request.acceptedQuotationId); const review = await Review.create({ businessId: quote.businessId, customerId: req.user.id, requestId: request.id, quotationId: quote.id, rating: req.body.rating, comment: req.body.comment }); const stats = await Review.aggregate([{ $match: { businessId: quote.businessId, status: 'approved' } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]); await Business.updateOne({ _id: quote.businessId }, { averageRating: stats[0].average, reviewCount: stats[0].count }); ok(res, review, 201) }))
app.get('/api/businesses/:id/reviews', asyncRoute(async (req, res) => ok(res, await Review.find({ businessId: req.params.id, status: 'approved' }).populate('customerId', 'fullName'))))
app.get('/api/promotions', asyncRoute(async (_req, res) => ok(res, await Promotion.find({ status: 'active', startDate: { $lte: new Date() }, endDate: { $gte: new Date() } }).populate('businessId', 'name slug logo'))))
app.post('/api/flags', requireAuth, asyncRoute(async (req, res) => ok(res, await Flag.create({ ...req.body, reporterId: req.user.id }), 201)))

app.get('/api/admin/stats', requireAuth, allowRoles('admin'), asyncRoute(async (_req, res) => ok(res, { users: await User.countDocuments(), customers: await User.countDocuments({ role: 'customer' }), businesses: await Business.countDocuments(), verified: await Business.countDocuments({ verificationStatus: 'verified' }), pending: await Business.countDocuments({ verificationStatus: 'pending' }), openRequests: await CustomerRequest.countDocuments({ status: { $in: ['open', 'matched', 'offers_received'] } }), quotations: await Quotation.countDocuments(), completed: await CustomerRequest.countDocuments({ status: 'completed' }), reviews: await Review.countDocuments(), flags: await Flag.countDocuments({ status: 'open' }) })))
app.get('/api/admin/businesses', requireAuth, allowRoles('admin'), asyncRoute(async (_req, res) => ok(res, await Business.find().populate('ownerId', 'fullName email').sort({ createdAt: -1 }))))
app.post('/api/admin/businesses/:id/:action', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => { const map = { verify: 'verified', 'request-changes': 'changes_requested', reject: 'rejected', suspend: 'suspended' }; if (!map[req.params.action]) return fail(res, 404, 'Unknown action.'); const business = await Business.findByIdAndUpdate(req.params.id, { verificationStatus: map[req.params.action], verificationNotes: req.body.reason || '' }, { new: true }); await Notification.create({ userId: business.ownerId, type: 'verification', title: `Verification ${map[req.params.action].replace('_', ' ')}`, body: req.body.reason || 'Your business verification status changed.' }); ok(res, business) }))
app.get('/api/admin/flags', requireAuth, allowRoles('admin'), asyncRoute(async (_req, res) => ok(res, await Flag.find().sort({ createdAt: -1 }))))
app.patch('/api/admin/flags/:id', requireAuth, allowRoles('admin'), asyncRoute(async (req, res) => ok(res, await Flag.findByIdAndUpdate(req.params.id, { status: req.body.status, adminNotes: req.body.adminNotes }, { new: true }))))

app.use((err, _req, res, _next) => { if (process.env.NODE_ENV !== 'test') console.error(err.message); fail(res, err.name === 'ValidationError' ? 400 : 500, err.name === 'ValidationError' ? err.message : 'Something went wrong. Please try again.') })
