import { accountRepository } from '../repositories/account.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { postLedgerTransaction } from './ledger.service.js'
import { generateAccountNumber } from '../utils/account-number.js'
import {
    NotFoundError,
    ForbiddenError,
    ValidationError,
    AccountFrozenError,
} from '../utils/errors.js'
import type { Account, AccountType, Currency } from '@prisma/client'
import {prisma} from "../db/prisma.js";

function getTreasuryId(): string {
    const id = process.env.TREASURY_ACCOUNT_ID;
    if(!id) throw new Error('TREASURY_ACCOUNT_ID env var is not set');
    return id
}

//Account Service
export const accountService = {
    async createAccount(params: {
        userId: string
        type: AccountType
        currency: Currency
        nickname?: string
        openingDepositCents?: bigint
    }): Promise<Account> {
        const { userId, type, currency, nickname, openingDepositCents } = params

        const user = await userRepository.findById(userId)
        if (!user) throw new NotFoundError('User', userId)

        const existingCount = await accountRepository.countByUserId(userId)
        if (existingCount >= 5) {
            throw new ValidationError('Users may not hold more than 5 accounts')
        }

        const isDefault = existingCount === 0
        const accountNumber = await generateAccountNumber()

        // Wrap account creation + opening deposit in ONE transaction.
        // Either both succeed or neither does — no partial state possible.
        const account = await prisma.$transaction(async (tx) => {

            // Write 1 — create the account row
            const newAccount = await tx.account.create({
                data: {
                    accountNumber,
                    userId,
                    type,
                    currency,
                    nickname,
                    isDefault,
                },
            })

            // Write 2 — opening deposit (if requested), using the SAME transaction
            if (openingDepositCents !== undefined) {
                if (openingDepositCents <= 0n) {
                    throw new ValidationError('Opening deposit must be greater than zero')
                }

                // Pass tx into postLedgerTransaction — it joins our transaction
                // rather than creating a new one. All writes are now atomic.
                await postLedgerTransaction({
                    type: 'DEPOSIT',
                    description: `Opening deposit for account ${newAccount.accountNumber}`,
                    entries: [
                        {
                            accountId: getTreasuryId(),
                            direction: 'DEBIT',
                            amount: openingDepositCents,
                            currency,
                        },
                        {
                            accountId: newAccount.id,
                            direction: 'CREDIT',
                            amount: openingDepositCents,
                            currency,
                        },
                    ],
                    metadata: { source: 'OPENING_DEPOSIT', accountId: newAccount.id },
                    tx, // ← inject the transaction client
                })
            }

            return newAccount

        }, { isolationLevel: 'Serializable' })

        return account
    },

    // Returns all accounts belonging to a user.
    async getAllUserAccounts(
        requestingId: string,
        targetId: string,
    ): Promise<Account[]> {
        if(requestingId !== targetId){
            throw new ValidationError('You can oly view you won accounts');
        }

        return accountRepository.findAllByUserId(targetId);
    },
    // Return a single account verifying the user owns it
    async getAccountById(
        requestingUserId: string,
        accountId: string,
    ): Promise<Account> {
        const account = await accountRepository.findById(accountId);
        if(!account) throw new NotFoundError("Account", accountId);

        if (account.userId !== requestingUserId){
            throw new NotFoundError("Account", accountId);
        }
        return account;
    },

    //Set an account as the user's default
    async setDefaultAccount(
        requestingUserId: string,
        accountId: string,
    ): Promise<void>{
        const account = await accountRepository.findById(accountId);
        if(!account) throw new NotFoundError("Account", accountId);

        if(requestingUserId !== account.userId) throw new ForbiddenError()
        if(account.status === 'FROZEN') throw new AccountFrozenError(account.id)
        await accountRepository.setDefault(account.userId, account.id);
    }
    
}

