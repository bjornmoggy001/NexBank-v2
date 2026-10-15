
import {AccountType, Currency} from "@prisma/client";
import {NexBankContext} from "../context.js";
import {requireAuth} from "./guards.js";
import {accountService} from "../services/account.service.js";
import {accountRepository} from "../repositories/account.repository.js";

//Format balance from cents to human-readable(KES, USD, EUR)
function formatBalance(cents: bigint, currency: Currency): string{
    const amount = Number(cents)/100
    return `${currency} ${amount.toFixed(2)}`
}
//ACCOUNT RESOLVER
export const accountResolver = {
    Query: {
        //Get Accounts
        async myAccounts(parent: unknown, args: unknown, context: NexBankContext){
            const user = requireAuth(context)
            return accountService.getAllUserAccounts(user.userId, user.userId)
        },
        // Get one account
        async account(
            parent: unknown,
            args: {accountId: string},
            context: NexBankContext){
            const user = requireAuth(context)
            return accountService.getAccountById(user.userId, args.accountId)
        },
        //Lookup account
        async lookupAccount(
            parent: unknown,
            args: {accountNumber: string},
            context: NexBankContext
        ){
            requireAuth(context)

            const account = await accountRepository.findByAccountNumberWithOwner(
                args.accountNumber.toUpperCase().trim(),
                )
            console.log("looked-up Account by resolver:", account)
            //return null if not found
            if(!account) return null
            //Don't show frozen/closed accounts
            if(account.status !== 'ACTIVE') return null

            return{
                id: account.id,
                accountNumber: account.accountNumber,
                currency: account.currency,
                ownerName: `${account.user.firstName} ${account.user.lastName[0]}`,
            }
        },
    },

    Mutation: {
        async createAccount(
            parent: unknown,
            args: {
                input:{
                    type: AccountType,
                    currency: Currency,
                    nickname?:string,
                    openingDepositCents?: bigint,
                }
            },
            context: NexBankContext){
            const user = requireAuth(context)
            return accountService.createAccount({
                userId: user.userId,
                ...args.input
            })

        },

        async setDefaultAccount(
            parent: unknown,
            args: {accountId: string},
            context: NexBankContext
        ){
            const user = requireAuth(context)
            await accountService.setDefaultAccount(user.userId, args.accountId)
            return true;
        },
    },

    Account:{
        balanceCents: (parent: {balanceCache: bigint}) => parent.balanceCache,
        balanceFormatted: (parent: {balanceCache: bigint, currency: Currency}) =>
            formatBalance(parent.balanceCache, parent.currency),
        createdAt: (parent: {createdAt: Date}) => parent.createdAt.toISOString(),
    }

}