import 'dotenv/config'
import { prisma } from '../db/prisma.js'
import {
    postLedgerTransaction,
    computeTrueBalance,
} from '../services/ledger.service.js'

async function main() {
    // ─────────────────────────────────────────────────────────────
    // Create users
    // ─────────────────────────────────────────────────────────────

    const userA = await prisma.user.create({
        data: {
            email: 'alice@nexbank.test',
            passwordHash: 'not-a-real-hash',
            firstName: 'Alice',
            lastName: 'Kamau',
        },
    })

    const userB = await prisma.user.create({
        data: {
            email: 'bob@nexbank.test',
            passwordHash: 'not-a-real-hash',
            firstName: 'Bob',
            lastName: 'Otieno',
        },
    })

    const treasuryUser = await prisma.user.create({
        data: {
            email: 'treasury@nexbank.test',
            passwordHash: 'not-a-real-hash',
            firstName: 'Treasury',
            lastName: 'System',
        },
    })


    // Create accounts
    // ALL ACCOUNTS START AT ZERO.
    // The ledger is responsible for creating balances.


    const treasury = await prisma.account.create({
        data: {
            accountNumber: 'NXB-TREASURY',
            userId: treasuryUser.id,
            type: 'CHECKING',
            currency: 'KES',
        },
    })

    const alice = await prisma.account.create({
        data: {
            accountNumber: 'NXB-001',
            userId: userA.id,
            type: 'CHECKING',
            currency: 'KES',
            // notice no balanceCache mentioned. we use the default 0n
        },
    })

    const bob = await prisma.account.create({
        data: {
            accountNumber: 'NXB-002',
            userId: userB.id,
            type: 'CHECKING',
            currency: 'KES',
            //same here, balanceCache is 0n aon initial account creation
        },
    })

    console.log('✓ Accounts created')


    // Seed the test by pretending Treasury already owns money.

    await prisma.account.update({
        where: { id: treasury.id },
        data: {
            balanceCache: 1_000_000_00n,//assume treasury already has a million
        },
    })


    // Fund Alice
    // One business event = one LedgerTransaction

    //Now I credit the 2 accounts from treasury, via deposit
    await postLedgerTransaction({
        type: 'DEPOSIT',
        description: 'Initial funding for Alice',

        entries: [
            {accountId: treasury.id, direction: 'DEBIT', amount: 100_00n, currency: 'KES'},
            {accountId: alice.id, direction: 'CREDIT', amount: 100_00n, currency: 'KES',},
        ],
    })


    // Fund Bob

    await postLedgerTransaction({
        type: 'DEPOSIT',
        description: 'Initial funding for Bob',

        entries: [
            {accountId: treasury.id, direction: 'DEBIT', amount: 100_00n, currency: 'KES',},
            {accountId: bob.id, direction: 'CREDIT', amount: 100_00n, currency: 'KES',},
        ],
    })

    console.log('✓ Alice funded with KES 100')
    console.log('✓ Bob funded with KES 100')


    // Alice transfers KES 25 to Bob

    const transfer = await postLedgerTransaction({
        type: 'TRANSFER_P2P',
        description: 'Alice sends Bob KES 25',

        entries: [
            {accountId: alice.id, direction: 'DEBIT', amount: 25_00n, currency: 'KES'},
            {accountId: bob.id, direction: 'CREDIT', amount: 25_00n, currency: 'KES',},
        ],
    })

    console.log('\n✓ Transfer posted')
    console.log(`Reference: ${transfer.reference}`)

    // ─────────────────────────────────────────────────────────────
    // Verify balances reconstructed from the ledger
    // ─────────────────────────────────────────────────────────────

    const [aliceTrue, bobTrue] = await Promise.all([
        computeTrueBalance(alice.id),
        computeTrueBalance(bob.id),
    ])

    const [aliceCached, bobCached] = await Promise.all([
        prisma.account.findUnique({
            where: { id: alice.id },
            select: { balanceCache: true },
        }),

        prisma.account.findUnique({
            where: { id: bob.id },
            select: { balanceCache: true },
        }),
    ])

    console.log('\n── Balance Verification ─────────────────────────')

    console.log(`Alice cache : KES ${Number(aliceCached!.balanceCache) / 100}`)
    console.log(`Alice ledger: KES ${Number(aliceTrue) / 100}`)

    console.log(`Bob cache   : KES ${Number(bobCached!.balanceCache) / 100}`)
    console.log(`Bob ledger  : KES ${Number(bobTrue) / 100}`)

    const ok =
        aliceCached!.balanceCache === aliceTrue &&
        bobCached!.balanceCache === bobTrue

    console.log(`\nLedger matches cache: ${ok ? '✅ YES' : '❌ NO'}`)

    // Cleanup


    await prisma.ledgerEntry.deleteMany()
    await prisma.ledgerTransaction.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()

    console.log('\n✓ Test data cleaned up')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())