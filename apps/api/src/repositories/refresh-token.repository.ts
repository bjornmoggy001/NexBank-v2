import {prisma} from '../db/prisma.js'
import { hashRefreshToken} from "../utils/crypto.js";
import type {RefreshToken} from "@prisma/client";
import {AuthTokens} from "../services/auth.service.js";
import {signAccessToken} from "../utils/jwt.js";

export const refreshTokenRepository = {
    async create(data: {
        userId: string
        token: string
        expiresAt: Date
        userAgent?: string
        ipAddress?: string
    }): Promise<void>{
        await prisma.refreshToken.create({
            data:{
                userId: data.userId,
                tokenHash: hashRefreshToken(data.token), // hash raw token before storage
                expiresAt: data.expiresAt,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
            },
        });
    },

    //find a token by its hash, return null if not found, null or revoked
    async findValid(rawToken: string): Promise<RefreshToken | null>{
        const tokenHash = hashRefreshToken(rawToken);
        return prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                expiresAt: {gt: new Date()},
                revokedAt: null,
            }
        })
    },
    // revoke refresh token on log out THIS device
    async revoke(rawToken: string): Promise<void>{
        const tokenHash = hashRefreshToken(rawToken);
        await prisma.refreshToken.updateMany({
            where: {tokenHash},
            data: { revokedAt: new Date()}
        })
    },
    //revoke all tokens for a user (logout from all devices)
    async revokeAll(userId: string): Promise<void>{
        await prisma.refreshToken.updateMany({
            where: {userId, revokedAt: null},
            data: {revokedAt: new Date()}
        })
    },
    //clean up expired tokens
    async deleteExpired() : Promise<number>{
        const result = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {lt: new Date()}
            },
        })
        return result.count
    },

}