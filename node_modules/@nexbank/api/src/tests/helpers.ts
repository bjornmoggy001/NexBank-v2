import {prisma} from '../db/prisma.js'
import type {User, Account, AccountType, Currency, AccountStatus} from '@prisma/client'
import { generateAccountNumber } from "../utils/account-number.js"

//wipe all tables between tests
export async function cleanDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
            "Transfer",
            "CardTransaction",
            "BillPayment",
            "LedgerEntry",
            "LedgerTransaction",
            "Card",
            "RefreshToken",
            "Notification",
            "AuditLog",
            "User"
        CASCADE
    `)
}

//crete minimal user for testing, avoids repeating this in every test
export async function createTestUser(overrides?: Partial<{
    email: string
    password: string
    firstName: string
    lastName: string
}>): Promise<User>{
    return prisma.user.create({
        data:{
            email: overrides?.email ?? `test-${crypto.randomUUID()}@nexbank.com`,
            passwordHash: 'not-a-real-hash',
            firstName: overrides?.firstName ?? 'Test',
            lastName: overrides?.lastName ?? 'User',
        }
    })
}

export async function createTestAccount(overrides?: Partial<{
    accountNumber: string
    userId: string
    type: AccountType
    status: AccountStatus
    currency: Currency
    balanceCache: bigint
}>): Promise<Account> {
    return prisma.account.create({
        data:{
            accountNumber: overrides?.accountNumber ?? await generateAccountNumber(),
            userId: overrides?.userId ?? `${crypto.randomUUID()}`,
            type: overrides?.type ?? "CHECKING",
            status: overrides?.status ?? "ACTIVE",
            currency: overrides?.currency ?? 'KES',
            balanceCache: overrides?.balanceCache ?? 50_000_00n
        }
    })
}

//create treasuryUser + account and then set TREASURY_ACCOUNT_ID in .env
export async function setupTreasury(): Promise<Account> {
    //create treasury user
    const treasuryUser = await prisma.user.create({
        data:{
            email: 'treasury@nexbank.com',
            passwordHash: 'not-a-real-hash',
            firstName: 'Treasury',
            lastName: 'System',
        }
    })

    //create treasury account
    const treasury = await prisma.account.create({
        data: {
            accountNumber: 'NBX-TREASURY',
            userId: treasuryUser.id,
            type: "CHECKING",
            balanceCache: 100_000_000_00n,
            currency: "KES"
        }
    })
    //set up the treasury id variable
    process.env.TREASURY_ACCOUNT_ID = treasury.id

    return treasury
}