import {describe, it, beforeEach, expect, afterAll} from "vitest";
import {prisma} from '../db/prisma.js';
import {authService} from '../services/auth.service.js';
import {cleanDatabase, createTestUser} from "./helpers.js";
import {DuplicateError, ValidationError} from "../utils/errors.js";
import {generateRefreshToken, hashRefreshToken} from "../utils/crypto.js";
import {refreshTokenRepository} from "../repositories/refresh-token.repository.js";
import {userRepository} from "../repositories/user.repository.js";

//SET UP THE ENVIRONMENT
describe('AuthService', () => {
    beforeEach(async (): Promise<void> => {
        await cleanDatabase()
    })
    //Test1. Registering a new user returns an access token and refresh token
    it("Registers a new user  and returns an access token and refresh token", async () => {
        //ACT
        const result = await authService.register({
            email: 'support@nexbank.com',
            password: 'StrongPass1',
            firstName: 'Test',
            lastName: 'User',
        })

        //ASSERT
        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
        //asert types as well
        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.refreshToken).toBe('string');
    })

    //Test.2 Registering with a duplicate email throws DuplicateError
    it("Throws a Duplicate Error when registering with a duplicate email", async () => {
        //ACT
        //Create a user with the same email
        await authService.register({
            email: 'info@nexbank.com',
            password: 'StrongPass1',
            firstName: "Test",
            lastName: 'User1',
        })
        await expect(authService.register({
            email: 'info@nexbank.com',
            password: 'StrongPass2',
            firstName: "Test",
            lastName: 'User2',
        })).rejects.toThrow(new DuplicateError("User", "email"));

    })
    //Test.3 Registering with a weak password throws ValidationError
    it("Throws a validation error when registering with a weak password", async () => {
        await expect(authService.register({
            email: 'user1@nexbank.com',
            password: 'WeakP1',
            firstName: "Test",
            lastName: 'User1',
        })).rejects.toThrow(new ValidationError('Password must be at least 8 characters long'));
        await expect(authService.register({
            email: 'user2@nexbank.com',
            password: 'weakpassword1',
            firstName: "Test",
            lastName: 'User2',
        })).rejects.toThrow(new ValidationError('Password must contain at least one uppercase letter'));
        await expect(authService.register({
            email: 'user2@nexbank.com',
            password: 'WEAKPASSWORD2',
            firstName: "Test",
            lastName: 'User2',
        })).rejects.toThrow(new ValidationError('Password must contain at least one lowercase letter'));

        await expect(authService.register({
            email: 'user2@nexbank.com',
            password: 'WeakPassword',
            firstName: "Test",
            lastName: 'User2',
        })).rejects.toThrow(new ValidationError('Password must contain at least one number'));
    })

    //Test.4 Logging in with correct credentials returns tokens
    it('Returns tokens when logging in with correct credentials', async () => {
        //ACT
        //first register
        await authService.register({
            email: 'user2@nexbank.com',
            password: 'StrongPass1',
            firstName: "Test",
            lastName: 'User2',
        });
        //then login
        const result = await authService.login(
            'user2@nexbank.com',
            'StrongPass1',
        )

        //ASSERT
        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()

    })
    //Test.5 Logging in with wrong password throws ValidationError
    it('Throws validation error when logging in with wrong credentials', async () => {
        //ACT
        //first register
        await authService.register({
            email: 'user2@nexbank.com',
            password: 'StrongPass1',
            firstName: "Test",
            lastName: 'User2',
        });
        //log in with wrong password
        await expect(authService.login(
            "user2@nexbank.com",
            'StrongPass2',
        )).rejects.toThrow(new ValidationError('Invalid email or password'));

        //log in with wrong email
        await expect(authService.login(
            "user@nexbank.com",
            'StrongPass1',
        )).rejects.toThrow(new ValidationError('Invalid email or password'));

    })
    //Test.6 refreshAccessToken with a valid refresh token returns a new access token
    it("refreshAccessToken with a valid refresh token returns a new access token", async () => {
        //ACT
        const rawRefreshToken = generateRefreshToken()
        const user = await userRepository.create({
            email : "zach@gmail.com",
            passwordHash: 'not_a_real_hash',
            firstName: "Test",
            lastName: "User2",
        })
        //save to database
        await refreshTokenRepository.create({
            userId: user.id,
            token: rawRefreshToken,
            expiresAt: new Date (Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent: "SM-A15",
            ipAddress: "192.168.1.2",
        })
        const result = await authService.refreshAccessToken(rawRefreshToken)

        //ASSERT
        expect(result.accessToken).toBeDefined()
    })
    //Test.7 Logging out revokes the refresh token (subsequent refreshAccessToken call should fail)
    it("Revokes the refresh token on logging out", async () => {
        //generate refreshToken
        const rawRefreshToken = generateRefreshToken()

        //call logout (which revokes the rawRefreshToken)
        await authService.logout(rawRefreshToken)

        //hash refreshToken, then check if revokedAt is not null (meaning it is set)
        const revoked= await prisma.refreshToken.findFirst({
            where:{
                tokenHash: hashRefreshToken(rawRefreshToken),
                revokedAt: {not: null}
            }
        })
        console.log(revoked)

        //Assert (expect revoked to be defined)
        expect(revoked).toBeDefined()

    })
    afterAll(async (): Promise<void> => {
        await cleanDatabase()
    })

})




