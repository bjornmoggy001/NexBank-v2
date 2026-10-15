import { accountRepository } from '../repositories/account.repository.js'
import { postLedgerTransaction } from './ledger.service.js'
import {
    NotFoundError,
    ForbiddenError,
    ValidationError,
    AccountFrozenError,
} from '../utils/errors.js'
import type { Currency } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import {transferRepository, type EnrichedTransfer} from "../repositories/transfer.repository.js";

//types
export interface TransferResult {
    reference: string
    fromAccountId: string
    toAccountId: string
    amountCents: bigint
    currency: Currency
    description: string
    createdAt: Date
}

//service
export const transferService = {
    async transfer(params: {
        requestingUserId: string
        fromAccountId: string
        toAccountId: string
        amountCents: bigint
        note?: string
    }): Promise<TransferResult> {
        const {requestingUserId, fromAccountId, toAccountId, amountCents, note} = params
        console.log("Transfer Service, fromAccountId", fromAccountId)
        console.log("Transfer Service, toAccountId", toAccountId)
        //validation
        if(amountCents <= 0){
            throw new ValidationError('Transfer amount must be greater than zero')
        }
        if(fromAccountId === toAccountId){
            throw new ValidationError('Cannot transfer to the same account')
        }

        //Ownership and eligibility checks
        //sender
        const fromAccount = await accountRepository.findById(fromAccountId)
        if(!fromAccount) throw new NotFoundError("Account", fromAccountId)

        //verify sender owns the source account
        if(fromAccount.userId !== requestingUserId) throw new ForbiddenError()

        //verify account status to transact
        if(fromAccount.status === "FROZEN") throw new AccountFrozenError(fromAccountId)

        //receiver
        const toAccount = await accountRepository.findById(toAccountId);
        if(!toAccount) throw new NotFoundError("Account", toAccountId)

        //verify account status to transact
        if(toAccount.status === "FROZEN") throw new AccountFrozenError(toAccountId);

        //Currency check
        if(fromAccount.currency !== toAccount.currency){
            throw new ValidationError(
                `Currency mismatch: source account currency is ${fromAccount.currency} to ${toAccount.currency}`+
                `destination is ${toAccount.currency}`+
                `Cross-currency transfers are not supported`
            )
        }

        //Post to ledger
        const description = note
            ? `Transfer: ${note}`
            : `Transfer from ${fromAccount.accountNumber} to ${toAccount.accountNumber}`

        const posted = await prisma.$transaction(async (tx) => {

            // Write 1 — post to ledger (joins our transaction via tx)
            const ledgerResult = await postLedgerTransaction({
                type: 'TRANSFER_P2P',
                description,
                entries: [
                    {
                        accountId: fromAccountId,
                        direction: 'DEBIT',
                        amount: amountCents,
                        currency: fromAccount.currency,
                    },
                    {
                        accountId: toAccountId,
                        direction: 'CREDIT',
                        amount: amountCents,
                        currency: fromAccount.currency,
                    },
                ],
                metadata: {
                    senderId: requestingUserId,
                    recipientId: toAccount.userId,
                    note,
                },
                tx, // ← inject
            })

            // Write 2 — Transfer record in the SAME transaction
            const transfer = await tx.transfer.create({
                data: {
                    ledgerTxnId: ledgerResult.ledgerTxnId,
                    fromAccountId,
                    toAccountId,
                    senderId: requestingUserId,
                    recipientId: toAccount.userId,
                    amount: amountCents,
                    currency: fromAccount.currency,
                    note,
                    status: 'COMPLETED',
                },
            })

            return { ledgerResult, transfer }

        }, { isolationLevel: 'Serializable' })

        return {
            reference: posted.ledgerResult.reference,
            fromAccountId: posted.transfer.fromAccountId,
            toAccountId: posted.transfer.toAccountId,
            amountCents: posted.transfer.amount,
            currency: posted.transfer.currency,
            description,
            createdAt: posted.transfer.createdAt,
        }
    },
    //Return paginated transfer results
    async getTransferHistory(params: {
        requestingUserId: string,
        accountId: string,
        page?: number,
        pageSize?: number,
    }): Promise<{transfers: EnrichedTransfer[]; total: number}> {
        const {requestingUserId, accountId, page=1, pageSize=20} = params;
        const account = await accountRepository.findById(accountId);
        console.log("Fetch account id is:", account?.id)
        if(!account) throw new NotFoundError("Account", accountId)
        if(requestingUserId !== account.userId) throw new ForbiddenError()

        const skip = (page - 1) * pageSize

        return transferRepository.findByAccountId({accountId, skip, take:pageSize})
}

}
