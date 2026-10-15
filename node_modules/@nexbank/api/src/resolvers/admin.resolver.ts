import {NexBankContext} from "../context.js";
import {KycStatus} from "@prisma/client";
import {userRepository} from "../repositories/user.repository.js";
import {requireAdmin} from "./guards.js";
import {prisma} from "../db/prisma.js";


export const adminResolver={
    Query: {
        async adminUsers(
            parent: unknown,
            args: { page: number, pageSize: number, status: KycStatus },
            context: NexBankContext
        ) {
            requireAdmin(context)
            const page = args.page ?? 1;
            const pageSize = args.pageSize ?? 20;
            const skip = (page - 1) * pageSize;

            const {users, total} = await userRepository.findAll({
                skip,
                take: pageSize,
                kycStatus: args.status,
            })

            return {users, total, page, pageSize};

        },
        async adminUser(
            parent: unknown,
            args: { id: string },
            context: NexBankContext,
        ) {
            requireAdmin(context)
            return userRepository.findById(args.id);
        },

    },
    Mutation:{
        async adminFreezeUser(
            parent: unknown,
            args: {userId:string, reason:string},
            context: NexBankContext,
        ){
            requireAdmin(context)
            const admin = context.user!
            //freeze
            await userRepository.setFrozen(
                args.userId,
                true,
                args.reason,
            )
            //audit log
            await prisma.auditLog.create({
                data:{
                    userId: admin.userId,
                    targetId: args.userId,
                    action: "ADMIN_FREEZE_USER",
                    metadata: {reason: args.reason}
                }
            })
            return true
        },
        async adminUnfreezeUser(
            parent: unknown,
            args: {userId:string},
            context: NexBankContext
        ){
            requireAdmin(context)
            const admin = context.user!

            await userRepository.setFrozen(
                args.userId,
                false,
            )

            await prisma.auditLog.create({
                data:{
                    userId: admin.userId,
                    targetId: args.userId,
                    action: "ADMIN_UNFREEZE_USER",
                }
            })
            return true
        },

        async adminUpdateKyc(
            parent: unknown,
            args: {userId:string, status:KycStatus, note?:string},
            context: NexBankContext
        ){
            requireAdmin(context)
            const admin = context.user!
            await userRepository.updateKycStatus(
                args.userId,
                args.status,
            )

            await prisma.auditLog.create({
                data:{
                    userId: admin.userId,
                    targetId: args.userId,
                    action: "ADMIN_UPDATE_KYC",
                }
            });

            return true
        }
    },

    AdminUser:{
        createdAt: (parent: {createdAt: Date})=> parent.createdAt.toISOString(),
        lastLoginAt: (parent: {lastLoginAt: Date | null}) => parent.lastLoginAt?.toISOString()
    }

}