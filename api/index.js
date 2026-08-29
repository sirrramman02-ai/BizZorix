import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { app } from '../server/src/app.js'
import { Business, User } from '../server/src/models.js'

let connectionPromise
let demoSetupPromise
const demoEnabled = () => process.env.ENABLE_DEMO_ACCOUNTS !== 'false'

async function enableStatelessDemo(reason) {
  if (!demoEnabled()) throw new Error(reason)
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'bizzorix-public-demo-session-secret-2026'
    console.warn('JWT_SECRET is missing. Using the public-demo session secret; configure a private JWT_SECRET before accepting real users.')
  }
  const passwordHash = await bcrypt.hash(process.env.DEMO_ACCOUNT_PASSWORD || 'Demo1234!', 10)
  const users = [
    { id: 'demo-customer', fullName: 'Aderonke Akinyemi', email: 'customer@bizzorix.demo', role: 'customer', preferredArea: 'Alagbaka' },
    { id: 'demo-business', fullName: 'Temitope Adesina', email: 'business@bizzorix.demo', role: 'business', preferredArea: 'Alagbaka' },
    { id: 'demo-admin', fullName: 'BizZorix Administrator', email: 'admin@bizzorix.demo', role: 'admin' },
  ].map((user) => ({ ...user, passwordHash, status: 'active' }))
  globalThis.__bizzorixFallbackUsers = new Map(users.map((user) => [user.id, user]))
  globalThis.__bizzorixRuntimeMode = 'stateless-demo'
  console.warn(`BizZorix is using stateless demo authentication: ${reason}`)
}

async function ensureDemoAccounts() {
  if (!demoEnabled()) return
  if (demoSetupPromise) return demoSetupPromise
  demoSetupPromise = (async () => {
    const passwordHash = await bcrypt.hash(process.env.DEMO_ACCOUNT_PASSWORD || 'Demo1234!', 12)
    const users = [
      { fullName: 'Aderonke Akinyemi', email: 'customer@bizzorix.demo', role: 'customer', preferredArea: 'Alagbaka' },
      { fullName: 'Temitope Adesina', email: 'business@bizzorix.demo', role: 'business', preferredArea: 'Alagbaka' },
      { fullName: 'BizZorix Administrator', email: 'admin@bizzorix.demo', role: 'admin' },
    ]
    for (const values of users) {
      await User.updateOne(
        { email: values.email },
        { $setOnInsert: { ...values, passwordHash, status: 'active' } },
        { upsert: true },
      )
    }
    const owner = await User.findOne({ email: 'business@bizzorix.demo' })
    await Business.updateOne(
      { ownerId: owner.id },
      { $setOnInsert: { ownerId: owner.id, name: 'Alagbaka Cakes & Treats', slug: 'alagbaka-cakes-and-treats', mainCategory: 'Food and Catering', area: 'Alagbaka', serviceAreas: ['Alagbaka', 'Ijapo Estate', 'Akure City Centre'], serviceTags: ['birthday cake', 'chocolate cake', 'cupcakes', 'delivery'], description: 'Celebration cakes baked fresh for every Akure moment.', verificationStatus: 'verified', averageRating: 4.9, reviewCount: 38 } },
      { upsert: true },
    )
  })()
  return demoSetupPromise
}

async function connectDatabase() {
  if (mongoose.connection.readyState === 1 || globalThis.__bizzorixFallbackUsers) return
  if (!process.env.MONGODB_URI) return enableStatelessDemo('MONGODB_URI is not configured in Vercel.')
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    if (demoEnabled()) process.env.JWT_SECRET = 'bizzorix-public-demo-session-secret-2026'
    else throw new Error('JWT_SECRET must be configured with at least 32 characters in Vercel.')
  }
  try {
    connectionPromise ||= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
    await connectionPromise
    globalThis.__bizzorixRuntimeMode = 'mongodb'
    await ensureDemoAccounts()
  } catch (error) {
    connectionPromise = undefined
    await mongoose.disconnect().catch(() => {})
    await enableStatelessDemo(`MongoDB connection failed: ${error.message}`)
  }
}

export default async function handler(req, res) {
  try {
    await connectDatabase()
    return app(req, res)
  } catch (error) {
    console.error('BizZorix Vercel API startup failed:', error.message)
    return res.status(503).json({ success: false, error: { message: 'The BizZorix API is not connected to its production database. Check the Vercel environment variables.' } })
  }
}
