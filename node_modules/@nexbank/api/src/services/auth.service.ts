import { userRepository } from '../repositories/user.repository.js'
import { refreshTokenRepository } from '../repositories/refresh-token.repository.js'
import { hashPassword, verifyPassword, generateRefreshToken } from '../utils/crypto.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { DuplicateError, NotFoundError, ValidationError } from '../utils/errors.js'
import { prisma } from '../db/prisma.js'


export interface AuthTokens{
    accessToken: string,
    refreshToken: string,
}
export interface RegisterParams{
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
    country?: string,
}

//Helper functions

//compute absolute expiry date for refresh token
function refreshExpiresAt() : Date{
const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
const days = parseInt(raw. replace('d', ''), 10);
const ms = days * 24 * 60 * 60 * 1000;

return new Date(Date.now() + ms)
}

//PASSWORD VALIDATION
function validatePasswordStrength(password: string) : void {
    if(password.length < 8){
        throw new ValidationError('Password must be at least 8 characters long');
    }
    if(!/[A-Z]/.test(password)){
        throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if(!/[a-z]/.test(password)){
        throw new ValidationError('Password must contain at least one lowercase letter');
    }
    if(!/[0-9]/.test(password)){
        throw new ValidationError('Password must contain at least one number');
    }
}

//AUTH SERVICE
export const authService = {
    async register(
        params : RegisterParams,
        meta: {userAgent?: string, ipAddress?: string} = {},
    ): Promise<AuthTokens>{
        const {email, password, firstName, lastName, phone, country} = params;

        //Check for duplicate email
        const existingEmail = await userRepository.findByEmail(email.toLowerCase());
        if(existingEmail) throw new DuplicateError("User", "email");

        //Validate password
        validatePasswordStrength(password);

        //hash password
        const passwordHash = await hashPassword(password);

        //Delegate to repository
        const user = await userRepository.create({
                email: email.toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                phone,
                country,
        })
        //issue tokens
        return authService._issueTokens(user.id, user.role, meta)
    },
    async login(
        email: string,
        password: string,
        meta: {userAgent?: string, ipAddress?: string} = {},
    ): Promise<AuthTokens> {
        //Find user
        const user = await userRepository.findByEmail(email.toLowerCase());
        if(!user) throw new ValidationError('Invalid email or password');

        //Verify password
        const valid = await verifyPassword(user.passwordHash, password)
        if(!valid) throw new ValidationError('Invalid email or password');

        //Check if account is active
        if(!user.isActive) throw new ValidationError('Account is disabled');
        if(user.isFrozen) throw new ValidationError('Account is frozen, please contact support');

        //record login timestamp (fire and forget don't block the response)
        userRepository.updateLastLogin(user.id).catch(console.error);

        //issue tokens
        return authService._issueTokens(user.id, user.role, meta)
    },
    async refreshAccessToken(rawRefreshToken: string): Promise<{accessToken: string}> {

        //check the token exists in DB and hasn't been revoked
        const stored = await refreshTokenRepository.findValid(rawRefreshToken)
        if(!stored) throw new ValidationError('Refresh token has been revoked');

        //find the user to get their current role in order to sign a new accessToken
        const user = await userRepository.findById(stored.userId);
        if(!user || !user.isActive) throw new ValidationError("User account no longer active");

        //mint a new accessToken
        return {
            accessToken: signAccessToken({userId: user.id, role: user.role}),
        }
    },
    //Log out from this device
    async logout(rawRefreshToken: string): Promise<void> {
        await refreshTokenRepository.revoke(rawRefreshToken)
    },
    //log out from all devices
    async logoutAllDevices(userId: string): Promise<void> {
        await refreshTokenRepository.revokeAll(userId)
    },

    //Internal helper _issueTokens
    async _issueTokens(
        userId: string,
        role: string,
        meta: {userAgent?: string, ipAddress?: string} = {}
    ) : Promise<AuthTokens>{
        const accessToken = signAccessToken({userId, role})
        const rawRefreshToken = generateRefreshToken()
        console.log("accessToken\n", accessToken)
        console.log("rawRefreshToken", rawRefreshToken)

        //create a db entry for the new refreshToken
        await refreshTokenRepository.create({
            userId,
            token: rawRefreshToken,
            expiresAt: refreshExpiresAt(),
            userAgent: meta.userAgent,
            ipAddress: meta.ipAddress
        })

        //audit log - fire and forget
        await prisma.auditLog.create({
            data:{
                userId,
                action: "LOGIN_SUCCESS",
                userAgent: meta.userAgent,
                ipAddress: meta.ipAddress,
            }
        })

        return {
            accessToken, refreshToken: rawRefreshToken
        }

    }
}
