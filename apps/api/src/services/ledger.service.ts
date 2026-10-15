import { prisma } from '../db/prisma.js'
import type { Currency, LedgerEntryType, AccountType, Prisma } from '@prisma/client'

//  Types

// A Prisma transaction client has the same interface as the regular client.
// We use this type to accept either - the real client or a tx-scoped client.
type PrismaTransactionClient = Prisma.TransactionClient
interface LedgerEntryInput {
    accountId: string
    direction: 'DEBIT' | 'CREDIT'
    amount: bigint
    currency: Currency
}

interface PostLedgerParams {
    type: LedgerEntryType
    description: string
    entries: [LedgerEntryInput, LedgerEntryInput, ...LedgerEntryInput[]]
    metadata?: Record<string, unknown>
    // then we add optional external transaction client (transfer can tie to it)
    tx?: PrismaTransactionClient
}

// transaction record including its generated reference number.
export interface PostedTransaction {
    ledgerTxnId: string
    reference: string
    entries: Array<{
        accountId: string
        direction: 'DEBIT' | 'CREDIT'
        amount: bigint
        balanceAfter: bigint
    }>
}

//  Validation

// Before touching the database, we verify the entries are balanced.
function assertBalanced(entries: LedgerEntryInput[]): void {
    const debits = entries
        .filter((e) => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0n)

    const credits = entries
        .filter((e) => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0n)

    if (debits !== credits) {
        // This is a programming error, not a user-facing error.
        // It should never reach production if our services are correct.
        throw new Error(
            `Ledger imbalance detected: debits=${debits} credits=${credits}. ` +
            `This is a bug — entries must balance before posting.`
        )
    }
}

//Reference Generator
function generateReference(): string {
    const year = new Date().getFullYear()
    const random = Math.random().toString(36).slice(2, 10).toUpperCase()
    return `NXB-${year}-${random}`
}

// Core Ledger Function
//Inner implementation:
//Accepts an external transaction client (tx) as the caller
//It never commits or rollback, that's caller responsibility
export async function _postLedgerTransactionWithTx(
    params: Omit<PostLedgerParams, 'tx'>,
    tx: PrismaTransactionClient
): Promise<PostedTransaction> {
    const {type, description, entries, metadata} = params

    // Step 1: Validate balance BEFORE opening a DB transaction.
    assertBalanced(entries)

    // Step 2: Lock the affected accounts for the duration of this transaction.

    const accountIds = [...new Set(entries.map((e) => e.accountId))]
    await tx.$queryRaw`
        SELECT id, "balanceCache"
        FROM "Account"
        WHERE id = ANY (${accountIds}::text[])
            FOR UPDATE
    `
    // At this point, no other transaction can modify these accounts
    // until we COMMIT or ROLLBACK. We have an exclusive lock.

    // Step 3: Fetch current balances (now safe - we hold the lock)
    const accounts = await tx.account.findMany({
        where: {id: {in: accountIds}},
        select: {id: true, accountNumber: true, type: true, balanceCache: true, status: true, currency: true},
    })

    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    // Step 4: Validate each account is eligible to transact
    for (const entry of entries) {
        const account = accountMap.get(entry.accountId)
        if (!account) {
            throw new Error(`Account ${entry.accountId} not found`)
        }
        if (account.status !== 'ACTIVE') {
            throw new Error(`Account ${entry.accountId} is ${account.status} and cannot transact`)
        }
        // Prevent cross-currency ledger entries — a KES account cannot
        if (account.currency !== entry.currency) {
            throw new Error(
                `Currency mismatch: account is ${account.currency} but entry is ${entry.currency}`
            )
        }
    }

    // Step 5: Check for sufficient funds on DEBIT entries
    for (const entry of entries.filter((e) => e.direction === 'DEBIT')) {
        const account = accountMap.get(entry.accountId)!
        if (account.type !== 'TREASURY' && account.balanceCache < entry.amount) {
            throw new Error(
                `Insufficient funds in account ${entry.accountId}: ` +
                `available=${account.balanceCache} required=${entry.amount}`
            )
        }
    }

    // Step 6: Compute new balances for each account
    // We process entries in order, tracking running balance per account.
    const newBalances = new Map<string, bigint>(
        accounts.map((a) => [a.id, a.balanceCache])
    )

    const entryResults: PostedTransaction['entries'] = []

    for (const entry of entries) {
        const current = newBalances.get(entry.accountId)!
        const updated =
            entry.direction === 'CREDIT'
                ? current + entry.amount
                : current - entry.amount

        newBalances.set(entry.accountId, updated)
        entryResults.push({
            accountId: entry.accountId,
            direction: entry.direction,
            amount: entry.amount,
            balanceAfter: updated,
        })
    }

    // Step 7: Create the LedgerTransaction record
    const reference = generateReference()
    const ledgerTxn = await tx.ledgerTransaction.create({
        data: {
            type,
            description,
            reference,
            metadata: metadata as Prisma.InputJsonValue,
            // Create all LedgerEntry rows in the same operation via nested write.
            // Prisma compiles this into a single INSERT with multiple rows.
            entries: {
                create: entries.map((entry, i) => ({
                    accountId: entry.accountId,
                    direction: entry.direction,
                    amount: entry.amount,
                    currency: entry.currency,
                    balanceAfter: entryResults[i].balanceAfter,
                })),
            },
        },
    })

    // Step 8: Update balanceCache on each account atomically
    // We use Promise.all so all UPDATEs fire in parallel within the same tx.
    await Promise.all(
        Array.from(newBalances.entries()).map(([accountId, newBalance]) =>
            tx.account.update({
                where: {id: accountId},
                data: {balanceCache: newBalance},
            })
        )
    )

    return {
        ledgerTxnId: ledgerTxn.id,
        reference: ledgerTxn.reference,
        entries: entryResults,
    }
}

//-------Public API: Outer implementation-----
//This is what callers import, they pass a `tx`, we use it
//Else we create the transaction and own the commit
export async function postLedgerTransaction(
    params: PostLedgerParams,
): Promise<PostedTransaction> {
    if(params.tx){
        //caller owns the transaction
        return _postLedgerTransactionWithTx(params, params.tx)
    }
    //No external transaction - create and own one
    return prisma.$transaction(
        async(tx) => _postLedgerTransactionWithTx(params, tx),
        {isolationLevel: 'Serializable'}
    )
}
// Convenience: Compute true balance from ledger entries
// normal balance checks (too slow at scale without specific pagination).
export async function computeTrueBalance(accountId: string): Promise<bigint> {
    const result = await prisma.ledgerEntry.aggregate({
        where: { accountId },
        _sum: { amount: true },
    })

    // conditional sums, so we use groupBy.
    const grouped = await prisma.ledgerEntry.groupBy({
        by: ['direction'],
        where: { accountId },
        _sum: { amount: true },
    })

    let credits = 0n
    let debits = 0n

    for (const group of grouped) {
        if (group.direction === 'CREDIT') credits = group._sum.amount ?? 0n
        if (group.direction === 'DEBIT') debits = group._sum.amount ?? 0n
    }

    return credits - debits
}