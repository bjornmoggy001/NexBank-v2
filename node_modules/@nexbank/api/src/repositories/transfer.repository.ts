import {prisma} from "../db/prisma.js"
import type {Currency, TransferStatus} from "@prisma/client";

export interface EnrichedTransfer {
    id: string
    ledgerTxnId: string
    reference: string
    fromAccountId: string
    toAccountId: string
    fromAccountNumber: string
    toAccountNumber: string
    senderName: string
    recipientName: string
    amount: bigint
    currency: Currency
    note: string | null
    status: TransferStatus
    createdAt: Date
}

// Transfer Repository
export const transferRepository = {
    async findByAccountId(params:{
        accountId: string
        skip: number
        take: number
    }): Promise<{transfers: EnrichedTransfer[], total: number}> {
        //destructure params
        const { accountId, skip, take } = params;

        const [transfers, total] = await Promise.all([
            //fetch transfers
            prisma.transfer.findMany({
                where: {
                    OR: [
                        { fromAccountId: accountId },
                        { toAccountId: accountId }
                    ]
                },
                include: {
                    ledgerTxn: { select: { reference: true } },
                    fromAccount: { select: { accountNumber: true } },
                    toAccount: { select: { accountNumber: true } },
                    sender: { select: { firstName: true, lastName: true } },
                    recipient: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            //count total
            prisma.transfer.count({
                where:{
                    OR:[
                        {fromAccountId: accountId},
                        {toAccountId: accountId}
                    ]
                }
            })
        ])
        return {
            transfers: transfers.map((t) => ({
                id: t.id,
                ledgerTxnId: t.ledgerTxnId,
                reference: t.ledgerTxn?.reference ?? "",
                fromAccountId: t.fromAccountId,
                toAccountId: t.toAccountId,
                fromAccountNumber: t.fromAccount.accountNumber,
                toAccountNumber: t.toAccount.accountNumber,
                senderName: `${t.sender.firstName} ${t.sender.lastName}`,
                recipientName: `${t.recipient.firstName} ${t.recipient.lastName}`,
                amount: t.amount,
                currency: t.currency,
                note: t.note,
                status: t.status,
                createdAt: t.createdAt
            })),
            total
        }
    }
}