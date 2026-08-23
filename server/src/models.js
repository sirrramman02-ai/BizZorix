import mongoose from 'mongoose'

const { Schema, model } = mongoose
const options = { timestamps: true }

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  optionalPhone: String, preferredArea: String,
  role: { type: String, enum: ['customer', 'business', 'admin'], default: 'customer' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
}, options)

const businessSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true }, slug: { type: String, unique: true, lowercase: true },
  description: String, mainCategory: String, subcategories: [String], logo: String, coverImage: String,
  gallery: [String], publicPhone: String, publicEmail: String, whatsappEnabled: { type: Boolean, default: false },
  area: String, addressDescription: String, serviceAreas: [String], serviceTags: [String],
  openingHours: Schema.Types.Mixed, contactPreferences: [String],
  verificationStatus: { type: String, enum: ['draft', 'pending', 'verified', 'changes_requested', 'rejected', 'suspended'], default: 'draft' },
  verificationNotes: String, averageRating: { type: Number, default: 0 }, reviewCount: { type: Number, default: 0 },
  profileViews: { type: Number, default: 0 }, isFeatured: { type: Boolean, default: false },
}, options)
businessSchema.index({ name: 'text', description: 'text', serviceTags: 'text' })

const itemSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true }, name: { type: String, required: true },
  type: { type: String, enum: ['product', 'service'], default: 'service' }, description: String, category: String,
  tags: [String], image: String, pricingType: { type: String, enum: ['fixed', 'starting', 'range', 'contact'], default: 'contact' },
  price: Number, minPrice: Number, maxPrice: Number, availabilityStatus: { type: String, default: 'available' },
  estimatedDuration: String, isPublished: { type: Boolean, default: true },
}, options)

const requestSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true },
  description: { type: String, required: true }, category: { type: String, required: true }, keywords: [String], area: { type: String, required: true },
  locationNote: String, budgetType: { type: String, enum: ['fixed', 'range', 'open'], default: 'open' }, budgetAmount: Number,
  minBudget: Number, maxBudget: Number, neededBy: Date, urgency: String, images: [String],
  status: { type: String, enum: ['open', 'matched', 'offers_received', 'in_progress', 'completed', 'cancelled', 'expired'], default: 'open' },
  acceptedQuotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
}, options)

const matchSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'CustomerRequest', required: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  score: { type: Number, min: 0, max: 100 }, reasons: [String],
  status: { type: String, enum: ['suggested', 'viewed', 'quoted', 'dismissed', 'expired'], default: 'suggested' },
}, options)
matchSchema.index({ requestId: 1, businessId: 1 }, { unique: true })

const quotationSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'CustomerRequest', required: true }, businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, amount: Number, minAmount: Number, maxAmount: Number,
  message: { type: String, required: true }, estimatedCompletion: String, availabilityNote: String, termsNote: String, expiryDate: Date,
  status: { type: String, enum: ['sent', 'viewed', 'accepted', 'declined', 'withdrawn', 'expired', 'completed', 'cancelled'], default: 'sent' },
}, options)
quotationSchema.index({ requestId: 1, businessId: 1, status: 1 })

const conversationSchema = new Schema({ customerId: { type: Schema.Types.ObjectId, ref: 'User' }, businessId: { type: Schema.Types.ObjectId, ref: 'Business' }, requestId: { type: Schema.Types.ObjectId, ref: 'CustomerRequest' }, quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' } }, options)
const messageSchema = new Schema({ conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true }, senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, body: { type: String, required: true, maxlength: 2000 }, readAt: Date }, options)
const notificationSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, type: String, title: String, body: String, link: String, readAt: Date }, options)
const reviewSchema = new Schema({ businessId: { type: Schema.Types.ObjectId, ref: 'Business' }, customerId: { type: Schema.Types.ObjectId, ref: 'User' }, requestId: { type: Schema.Types.ObjectId, ref: 'CustomerRequest', unique: true, sparse: true }, quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' }, rating: { type: Number, min: 1, max: 5 }, comment: String, status: { type: String, default: 'approved' } }, options)
const savedSchema = new Schema({ customerId: { type: Schema.Types.ObjectId, ref: 'User' }, businessId: { type: Schema.Types.ObjectId, ref: 'Business' } }, options)
savedSchema.index({ customerId: 1, businessId: 1 }, { unique: true })
const promotionSchema = new Schema({ businessId: { type: Schema.Types.ObjectId, ref: 'Business' }, title: String, description: String, image: String, startDate: Date, endDate: Date, status: { type: String, default: 'active' }, isFeatured: { type: Boolean, default: false } }, options)
const referenceSchema = new Schema({ name: { type: String, required: true, unique: true }, slug: String, icon: String, active: { type: Boolean, default: true }, order: Number }, options)
const flagSchema = new Schema({ reporterId: { type: Schema.Types.ObjectId, ref: 'User' }, targetType: String, targetId: Schema.Types.ObjectId, reason: String, details: String, status: { type: String, default: 'open' }, adminNotes: String }, options)
const deliveryRequestSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  riderId: String, riderName: String,
  orderTrackingCode: String, pickupBusiness: { type: String, required: true }, pickupArea: { type: String, required: true },
  destinationArea: { type: String, required: true }, destinationNote: String,
  itemDescription: { type: String, required: true, maxlength: 500 }, recipientName: String,
  recipientPhone: String, vehicleType: { type: String, enum: ['bike', 'car', 'van'], default: 'bike' },
  estimatedFee: Number,
  offers: [{ id: String, dispatcherId: String, dispatcherName: String, vehicleType: String, deliveryFee: Number, estimatedPickupTime: String, estimatedArrivalTime: String, rating: Number, completedDeliveries: Number, responseRate: Number, cancellationRate: Number, identityVerified: Boolean, status: { type: String, default: 'sent' } }],
  acceptedOfferId: String,
  pickupCodeHash: { type: String, select: false }, deliveryCodeHash: { type: String, select: false },
  routeShare: { eligible: Boolean, groupCode: String, participantCount: Number, savings: Number },
  timeline: [{ status: String, label: String, at: Date }], replacementCount: { type: Number, default: 0 },
  status: { type: String, enum: ['requested', 'accepted', 'preparing', 'picking_up', 'in_transit', 'delivered', 'cancelled'], default: 'requested' },
}, options)
deliveryRequestSchema.index({ pickupArea: 1, destinationArea: 1, status: 1, createdAt: -1 })
deliveryRequestSchema.index({ orderTrackingCode: 1 })
const productOrderSchema = new Schema({
  trackingCode: { type: String, required: true, unique: true, uppercase: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
  businessName: { type: String, required: true }, productName: { type: String, required: true }, quantity: { type: Number, min: 1, default: 1 },
  image: String, notes: String,
  status: { type: String, enum: ['confirmed', 'preparing', 'ready', 'collected', 'completed', 'cancelled'], default: 'confirmed' },
  timeline: [{ status: String, label: String, at: Date }], deliveryRequested: { type: Boolean, default: false },
}, options)
productOrderSchema.index({ customerId: 1, createdAt: -1 })

export const User = model('User', userSchema)
export const Business = model('Business', businessSchema)
export const ProductService = model('ProductService', itemSchema)
export const CustomerRequest = model('CustomerRequest', requestSchema)
export const Match = model('Match', matchSchema)
export const Quotation = model('Quotation', quotationSchema)
export const Conversation = model('Conversation', conversationSchema)
export const Message = model('Message', messageSchema)
export const Notification = model('Notification', notificationSchema)
export const Review = model('Review', reviewSchema)
export const SavedBusiness = model('SavedBusiness', savedSchema)
export const Promotion = model('Promotion', promotionSchema)
export const Category = model('Category', referenceSchema)
export const Area = model('Area', referenceSchema)
export const Flag = model('Flag', flagSchema)
export const DeliveryRequest = model('DeliveryRequest', deliveryRequestSchema)
export const ProductOrder = model('ProductOrder', productOrderSchema)
