/*
* The answer: beforeEach is better because when a test fails halfway through, the database is left in whatever state the failure created.
* If you clean in afterEach, a failed test skips the cleanup and the next test starts with dirty data.
* If you clean in beforeEach, every test starts clean regardless of what the previous test did.
* Failed tests leave their data in the database — which is actually useful,
* because you can inspect it after a failure to understand what went wrong.

Question 2 — Why beforeAll not module-level for the DB URL check:

The reason: vitest.config.ts specifies setupFiles, which are executed in the test environment.
* If you put code at the module top level, it runs during module evaluation, before Vitest has fully initialized its environment and before .env.test
* has been loaded by dotenv. Inside beforeAll, Vitest guarantees the environment is ready.
* Module-level code in setup files can run too early and see undefined env vars.

Question 3 — Why entryCount === 0 is more valuable than just checking balances:

Here's the insight: balances not changing proves the cache wasn't mutated.
* But it doesn't prove the ledger is clean. Theoretically,
* a buggy implementation could write ledger entries and then fail to update balances,
* the cache would be correct but the ledger would be corrupted with orphaned entries that make computeTrueBalance wrong forever.
* Checking entryCount === 0 proves the entire transaction rolled back atomically, both the entry writes and the balance updates.
* It tests the deeper guarantee.
* */


import {describe, it, expect, beforeEach, afterAll} from 'vitest'
import { prisma } from '../db/prisma.js'
import { postLedgerTransaction, computeTrueBalance } from '../services/ledger.service.js'
import {cleanDatabase, createTestAccount, createTestUser} from './helpers.js'

//DESCRIBE ENVIRONMENT
describe('postLedgerTransaction', () => {
    beforeEach(async () => {
        await cleanDatabase()
    })
    it('Posts a balance deposit and updates balanceCache correctly', async () => {
        //ARRANGE
        const user = await createTestUser()
        const sourceAccount = await prisma.account.create({
            data: {
                accountNumber: 'NBX-SOURCE',
                userId: user.id,
                type: 'CHECKING',
                currency: "KES",
                balanceCache: 1000_00n

            }
        })
        const destAccount = await prisma.account.create({
            data: {
                accountNumber: 'NBX-DEST',
                userId: user.id,
                type: "CHECKING",
                currency: "KES",
                balanceCache: 0n
            }
        })
        //ACT
        const result = await postLedgerTransaction({
            type: 'DEPOSIT',
            description: 'Test Deposit',
            entries: [
                {accountId: sourceAccount.id, direction: 'DEBIT', amount: 500_00n, currency: "KES"},
                {accountId: destAccount.id, direction: "CREDIT", amount: 500_00n, currency: "KES"}
            ],
        })
        //ASSERT
        expect(result.reference).toMatch(/^NXB-\d{4}-[A-Z0-9]+$/)
        expect(result.entries).toHaveLength(2)
        // verify balance was updated
        const updatedSource = await prisma.account.findUnique({
            where: {id : sourceAccount.id}
        })
        const updatedDest = await prisma.account.findUnique({
            where: {id: destAccount.id}
        })

        expect(updatedSource?.balanceCache).toBe(500_00n);
        expect(updatedDest?.balanceCache).toBe(500_00n);

    })

    //Test. 2
    it('throws if entries are unbalanced', async () => {
        //ARRANGE
        //create 2 users
        const userA =  await createTestUser();
        const userB = await createTestUser();
        //create 2 accounts
        const accountA = await createTestAccount({userId: userA.id});
        const accountB = await createTestAccount({userId: userB.id});

        //ASSERT
        await expect(
            postLedgerTransaction({
                type: "TRANSFER_P2P",
                description: 'Test Ledger Imbalance',
                entries: [
                    { accountId: accountA.id, direction: "DEBIT", amount: 100_00n, currency: 'KES'},
                    {accountId: accountB.id, direction: "CREDIT", amount: 50_00n, currency: 'KES'},
                ]
        })).rejects.toThrow(
        `Ledger imbalance detected: debits=10000 credits=5000. ` +
            `This is a bug — entries must balance before posting.`
        )
    })
    //Test. 3
    it('throws and rolls back if account has insufficient funds', async () => {
        //ARRANGE
        //create 2 users
        const userA =  await createTestUser();
        const userB = await createTestUser();
        //create 2 accounts
        const accountA = await createTestAccount({userId: userA.id});
        const accountB = await createTestAccount({userId: userB.id});

        await expect(
            postLedgerTransaction({
                type: "TRANSFER_P2P",
                description: "insufficient funds test",
                entries: [
                    {accountId: accountA.id, direction: "DEBIT", amount: 100_000_00n, currency: "KES"},
                    {accountId: accountB.id, direction: "CREDIT", amount: 100_000_00n, currency: "KES"}
                ]
            })
        ).rejects.toThrow(
            `Insufficient funds in account ${accountA.id}: ` +
            `available=${accountA.balanceCache} required=10000000`
        )
        const [accountA_Updated, accountB_Updated] = await Promise.all([
            prisma.account.findUniqueOrThrow({ where: {id: accountA.id}}),
            prisma.account.findUniqueOrThrow({where: {id: accountB.id}}),
        ])

        //expect a rollback
        expect(accountA_Updated.balanceCache).toBe(50_000_00n)
        expect(accountB_Updated.balanceCache).toBe(50_000_00n)

        //entries should be zero as well
        const entryCount = await prisma.ledgerEntry.count()
        expect(entryCount).toBe(0)
    })
    //Test.4
    it('correctly derives true balance matching balanceCache when all history is in ledger', async () => {
        //ARRANGE
        const Alice = await createTestUser()
        const Bob = await createTestUser()
        const treasuryUser = await createTestUser()

        const AliceAccount = await createTestAccount({userId: Alice.id, balanceCache: 0n});
        const BobAccount = await createTestAccount({userId: Bob.id});
        const treasury = await createTestAccount({userId: treasuryUser.id});

        //ACT
        await postLedgerTransaction({
            type: "DEPOSIT",
            description: 'Test compute balance',
            entries: [
                {accountId: treasury.id, direction: "DEBIT", amount: 3000_00n, currency: "KES"},
                {accountId: AliceAccount.id, direction: "CREDIT", amount: 3000_00n, currency: "KES"}
            ]
        })
        await postLedgerTransaction({
            type: "TRANSFER_P2P",
            description: 'Test compute balance',
            entries: [
                {accountId: AliceAccount.id, direction: "DEBIT", amount: 3000_00n, currency: "KES"},
                {accountId: BobAccount.id, direction: "CREDIT", amount: 3000_00n, currency: "KES"}
            ]
        })
        //ASSERT
        const AliceTrueBalance =  await computeTrueBalance(AliceAccount.id)
        const AliceCache = await prisma.account.findUniqueOrThrow({
            where: {id: AliceAccount.id},
            select: {balanceCache: true}
        })
        expect(AliceTrueBalance).toBe(0n)
        expect(AliceCache.balanceCache).toBe(AliceTrueBalance)
    })

    //Test.5 (Exercise)
    it("Aborts transaction if account is frozen", async () => {
        //ARRANGE
        const Alice = await createTestUser();
        const Bob = await createTestUser()

        //create their accounts with Bob's account being frozen
        const AliceAccount = await createTestAccount({userId: Alice.id})
        const BobAccount = await createTestAccount({userId: Bob.id, status: "FROZEN"})

        //ASSERT
        await expect(
            postLedgerTransaction({
                type: "TRANSFER_P2P",
                description: "Test frozen account",
                entries: [
                    {accountId: AliceAccount.id, direction: "DEBIT", amount: 200_00n, currency: "KES" },
                    {accountId: BobAccount.id, direction: "CREDIT", amount: 200_00n, currency: "KES"}
                ]
            })
        ).rejects.toThrow(
            `Account ${BobAccount.id} is FROZEN and cannot transact`
        )


    })

    afterAll(async (): Promise<void> => {
        await cleanDatabase()
    })




})
