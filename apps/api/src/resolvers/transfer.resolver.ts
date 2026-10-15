

//TRANSFER RESOLVER
import {NexBankContext} from "../context.js";
import {requireAuth} from "./guards.js";
import {transferService} from "../services/transfer.service.js";
import {Currency} from "@prisma/client";

export const transferResolver = {
    Query: {
        async transferHistory(
            parent: unknown,
            args: {
                    accountId: string,
                    page: number,
                    pageSize: number,
            },
            context: NexBankContext
        ){
            const user = requireAuth(context)
            const result = await transferService.getTransferHistory({
                requestingUserId: user.userId,
                accountId: args.accountId,
                page: args.page,
                pageSize: args.pageSize,
            })
            console.log("Transfer Resolver, recipient name is:", result.transfers[0].recipientName)
            return {
                transfers: result.transfers.map((t) => ({
                    ...t,
                    amountCents: t.amount,
                    createdAt: t.createdAt,
                })),
                total: result.total,
                page: args.page ?? 1,
                pageSize: args.pageSize ?? 20,
            }
        },
    },
    Mutation: {
        async transfer(
            parent: unknown,
            args: {
                input:{
                    fromAccountId: string,
                    toAccountId: string,
                    amountCents: bigint,
                    note?: string,
                }
            },
            context: NexBankContext
        ){
            const user = requireAuth(context)
            const result = await transferService.transfer({
                requestingUserId: user.userId,
                fromAccountId: args.input.fromAccountId,
                toAccountId: args.input.toAccountId,
                amountCents: args.input.amountCents,
                note: args.input.note
            });
            return {
                ...result,
                createdAt: result.createdAt.toISOString(),
            }
        }
    }
}