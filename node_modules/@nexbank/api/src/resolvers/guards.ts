//This is a guard helper function
//Extracts user from context
//Throws a forbidden error if no user found

import {ForbiddenError} from "../utils/errors.js";
import {NexBankContext} from "../context.js"
import type {AccessTokenPayload} from "../utils/jwt.js";

export function requireAuth(context: NexBankContext): AccessTokenPayload{
    if(!context.user){
        throw new ForbiddenError("You must be logged in to perform this operation.");
    }
    return context.user
}

export function requireAdmin(context: NexBankContext): AccessTokenPayload{
    const user = requireAuth(context)
    if(user.role !== "ADMIN"){
        throw new ForbiddenError("Admin access required");
    }
    return user
}