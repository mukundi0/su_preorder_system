import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod

export async function setup({ provide }) {
    mongod = await MongoMemoryServer.create()
    provide('MONGO_URI', mongod.getUri())
}

export async function teardown() {
    if (mongod) await mongod.stop()
}
