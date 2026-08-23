import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { app } from './app.js'

const port = process.env.PORT || 5000

async function connectDatabase() {
  const configuredUri = process.env.MONGODB_URI
  const isDefaultLocal = !configuredUri || configuredUri === 'mongodb://127.0.0.1:27017/bizzorix'
  try {
    await mongoose.connect(configuredUri || 'mongodb://127.0.0.1:27017/bizzorix', {
      serverSelectionTimeoutMS: isDefaultLocal ? 2500 : 10000,
    })
    console.log(`Connected to ${configuredUri ? 'the configured' : 'local'} MongoDB database.`)
  } catch (error) {
    if (!isDefaultLocal || process.env.NODE_ENV === 'production') throw error
    console.warn('Local MongoDB is unavailable. Starting the self-contained development database…')
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const { seedDatabase } = await import('./seed.js')
    try {
      const memoryDatabase = await MongoMemoryServer.create({ instance: { dbName: 'bizzorix' } })
      await mongoose.connect(memoryDatabase.getUri())
      await seedDatabase({ connect: false, disconnect: false })
      globalThis.__bizzorixMemoryDatabase = memoryDatabase
      console.log('Development database is ready with the BizZorix demo accounts.')
    } catch (memoryError) {
      console.warn(`Temporary MongoDB could not run (${memoryError.signal || memoryError.message}).`)
      const passwordHash = await bcrypt.hash('Demo1234!', 10)
      const demoUsers = [
        { id: 'demo-customer', fullName: 'Aderonke Akinyemi', email: 'customer@bizzorix.demo', role: 'customer' },
        { id: 'demo-business', fullName: 'Temitope Adesina', email: 'business@bizzorix.demo', role: 'business' },
        { id: 'demo-admin', fullName: 'BizZorix Administrator', email: 'admin@bizzorix.demo', role: 'admin' },
      ].map((user) => ({ ...user, passwordHash, status: 'active', preferredArea: 'Alagbaka' }))
      globalThis.__bizzorixFallbackUsers = new Map(demoUsers.map((user) => [user.id, user]))
      console.log('Compatibility authentication mode is ready. New accounts persist until the API restarts.')
    }
  }
}

connectDatabase()
  .then(() => app.listen(port, () => console.log(`BizZorix API running on http://localhost:${port}`)))
  .catch((error) => {
    console.error(`Could not start the BizZorix database: ${error.message}`)
    console.error('Set MONGODB_URI in .env, or allow the development database download on first run.')
    process.exit(1)
  })
