
//name the cookie
import {NexBankContext} from "../context.js";
import {authService} from "../services/auth.service.js";
import {AccessTokenPayload} from "../utils/jwt.js";
import {ValidationError} from "../utils/errors.js";
import {requireAuth} from "./guards.js";

const REFRESH_TOKEN_COOKIE = 'nxb-refresh-token'

//define cookie options
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000
}

// DEFINE THE AUTH RESOLVER
export const authResolver = {
    Query: {
        //CHECK AUTHENTICATION
        async checkAuth(
            parent: unknown,
            args: unknown,
            context: NexBankContext
        ){
            console.log("RESOLVER context keys", Object.keys(context))
            console.log("RESOLVER full context", context.user)
            return context.user ? context.user.userId : "not authenticated"
        },
    },
    Mutation: {
        async register(
            parent: unknown,
            args: {
                input:{
                    email: string,
                    password: string,
                    firstName: string,
                    lastName: string,
                    phone?: string,
                    country?: string
                }
            },
            context: NexBankContext,
        ){
            //Delegate core logic to service layer
            const tokens = await authService.register(args.input, {
                userAgent: context.req.headers['user-agent'],
                ipAddress: context.req.ip
            })
            //set refreshToken as httpOnly cookie
            context.res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS)

            //return accessToken in the body
            return {
                accessToken: tokens.accessToken
            }

        },

        //LOGIN
        async login(
            parent: unknown,
            args: {email: string, password: string},
            context: NexBankContext
        ){
            const tokens = await authService.login(args.email, args.password);

            //set the refreshToken as httpOnly cookie
            context.res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS)

            return {accessToken: tokens.accessToken}
        },

        //REFRESH ACCESS TOKEN
        async refreshToken(
            parent: unknown, args: unknown, context: NexBankContext
        ):Promise<{accessToken: string}>{
            //read the refreshToken from httpOnly cookie
            const rawRefreshToken = context.req.cookies?.[REFRESH_TOKEN_COOKIE]
            if(!rawRefreshToken){
                throw new Error("No refresh token found.");
            }
            return await authService.refreshAccessToken(rawRefreshToken)
        },

        //lOG-OUT
        async logout(
            parent: unknown, args: unknown, context: NexBankContext
        ):Promise<Boolean>{
            //read the refresh token
            const rawRefreshToken = context.req.cookies?.[REFRESH_TOKEN_COOKIE]
            if(rawRefreshToken){
                //revoke the refreshToken
                await authService.logout(rawRefreshToken)
            }
            //clear cookie
            context.res.clearCookie(REFRESH_TOKEN_COOKIE)

            return true
        },

        //LOG OUT ALL DEVICES
        async logoutAllDevices(
            parent: unknown, args: unknown, context: NexBankContext
        ): Promise<Boolean>{
            //check auth
            const user = requireAuth(context)
            //extract refreshToken
            const rawRefreshToken = context.req.cookies?.[REFRESH_TOKEN_COOKIE]
            if(rawRefreshToken){
                await authService.logoutAllDevices(user.userId)
            }
            context.res.clearCookie(REFRESH_TOKEN_COOKIE)
            return true
        }
    }
}