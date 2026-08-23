import mongoose from 'mongoose'
import { app } from './app.js'

const port = process.env.PORT || 5000
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bizzorix')
  .then(() => app.listen(port, () => console.log(`BizZorix API running on http://localhost:${port}`)))
  .catch((error) => { console.error(`Could not connect to MongoDB: ${error.message}`); process.exit(1) })
