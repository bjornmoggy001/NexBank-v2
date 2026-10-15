import 'dotenv/config'
import {prisma} from '../db/prisma.js'
import {afterAll, beforeAll} from "vitest";

beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL ?? ''
    if(!dbUrl.includes('test') && !dbUrl.includes('nexbank_test')) {
        throw new Error(
            'Tests must run against a test database' +
            'DATABASE_URL does not contain "test". Aborting to protect your dev data.')
    }
    await prisma.$connect()
})

afterAll(async () => {
    await prisma.$disconnect()
})