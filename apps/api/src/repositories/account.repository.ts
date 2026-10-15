import {prisma} from '../db/prisma.js';
import {Account, AccountStatus, AccountType, Currency} from "@prisma/client";

export const accountRepository={
    async findById(id: string): Promise<Account | null>  {
        return prisma.account.findUnique({ where: { id } })
    },
    async findByAccountNumber(accountNumber: string): Promise<Account | null>  {
        return prisma.account.findUnique({ where: {accountNumber} })
    },
    async findAllByUserId(userId: string): Promise<Account[]>  {
        return prisma.account.findMany({
            where: {
                userId,
            },
            orderBy:{
                createdAt: 'asc',
            }
        })
    },
    async findByAccountNumberWithOwner(accountNumber: string): Promise<{
        id: string;
        accountNumber: string;
        currency: Currency;
        status: AccountStatus;
        user: {firstName: string; lastName: string};
    } | null>  {
        return prisma.account.findUnique({
            where: {
                accountNumber
                },
            select: {
                id: true,
                accountNumber: true,
                currency: true,
                status: true,
                user: {
                    select: {firstName: true, lastName: true}
                }
            }
        })
    },
    async create(data:{
        accountNumber: string,
        userId: string,
        type: AccountType,
        currency: Currency,
        nickname?: string,
        isDefault?: boolean,
    }): Promise<Account> {
        return prisma.account.create({ data })
    },

    async countByUserId(userId: string): Promise<number>  {
        return prisma.account.count({
            where: {userId}
        })
    },
    async setDefault(userId: string, accountId: string): Promise<void>  {
        await prisma.$transaction([
            prisma.account.updateMany({
                where: {userId, isDefault: true},
                data: {isDefault: false}
            }),
            prisma.account.update({
                where: {id: accountId},
                data: {isDefault: true}
            })
        ])
    }
}