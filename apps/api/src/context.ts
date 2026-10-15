//graphQl resolvers need to check auth every time they receive a request
//we use a context middleware to check user's auth status once
//and then pass that as a context to resolvers
import { verifyAccessToken} from "./utils/jwt.js";
import type {AccessTokenPayload} from "./utils/jwt.js";
import {Request, Response} from 'express';

//declare the context interface
export interface NexBankContext{
    req: Request,
    res: Response,
    user: AccessTokenPayload | null
}

//create the auth context
export async function createContext({
    req,
    res
                                    }: {
    req: Request
    res: Response
}): Promise<NexBankContext> {
    let user: AccessTokenPayload | null=null

    const authHeader = req.headers.authorization;
    console.log("authHeader:", authHeader);
    if (authHeader?.startsWith("Bearer ")) {
        //verify the token
        try{
            user = verifyAccessToken(authHeader?.slice(7))
        }catch(error){
            // @ts-ignore
            console.log("Token failed:", error.message)
        }
    }
    return {
        req, res, user
    }

}