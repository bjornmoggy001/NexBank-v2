import {prisma} from '../db/prisma.js'
import type {User, KycStatus} from "@prisma/client";

export const userRepository = {
    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where:{
                id
            }
        })
    },
    async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where:{
                email
            }
        })
    },
    async findByPhone(phone: string): Promise<User | null> {
        return prisma.user.findUnique({
            where:{
                phone
            }
        })
    },

    async create(data: {
        email: string
        phone?: string
        passwordHash: string
        firstName: string
        lastName: string
        country?: string
                 }): Promise<User> {
        return prisma.user.create({data})
    },
    async updateLastLogin(id: string): Promise<void> {
        await prisma.user.update({
            where: {id},
            data: {lastLoginAt: new Date()},
        })
    },
    async updateKycStatus(id: string, status: KycStatus): Promise<User>{
        return prisma.user.update({
            where: {id},
            data: {
                kycStatus: status,
                kycVerifiedAt: status === 'VERIFIED' ? new Date() : undefined
            }
        })
    },
    async setFrozen(id: string, frozen: boolean, reason?: string): Promise<User> {
        return prisma.user.update({
            where: {id},
            data:{
                isFrozen: frozen,
                frozenReason: frozen ? reason : null
            }
        })
    },
    async findAll(opts:{
        skip?: number,
        take?: number
        kycStatus?: KycStatus
    }): Promise<{ users: User[]; total: number}> {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where:{
                    kycStatus: opts.kycStatus
                },
                skip : opts.skip ?? 0,
                take : opts.take ?? 20,
                orderBy: {createdAt: 'desc'}
            }),
            prisma.user.count({
                where:{
                    kycStatus: opts.kycStatus,
                }
            }),
        ])
        return {users, total}
    }

}