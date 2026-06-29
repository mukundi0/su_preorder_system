import { beforeAll, afterEach, inject } from 'vitest'
import mongoose from 'mongoose'

beforeAll(async () => {
    const uri = inject('MONGO_URI')
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri)
    }
})

afterEach(async () => {
    const { collections } = mongoose.connection
    await Promise.all(Object.values(collections).map(c => c.deleteMany({})))
})
