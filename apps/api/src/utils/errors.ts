
export class NexBankError extends Error {
    constructor(
        message: string,
        public readonly code: string,
    ){
        super(message)
        this.name = "NexBankError"

        Object.setPrototypeOf(this, new.target.prototype)
    }
}
export class NotFoundError extends NexBankError {
    constructor(resource: string, id: string) {
        super(`${resource} not found: ${id}`, 'NOT_FOUND')
        this.name = "NotFoundError"
    }
}
export class ForbiddenError extends NexBankError {
    constructor( message = "Access denied!") {
        super(message, 'FORBIDDEN')
        this.name = "ForbiddenError"
    }
}
export class ValidationError extends NexBankError {
    constructor(message: string){
        super(message, 'VALIDATION_ERROR')
        this.name = "ValidationError"
    }
}
export class InsufficientFundsError extends NexBankError {
    constructor(available: bigint, required: bigint) {
        super(`Insufficient Funds: available ${available}, required: ${required}`,
            'INSUFFICIENT_FUNDS');
        this.name = "Insufficient Funds"
    }
}
export class AccountFrozenError extends NexBankError {
    constructor(accountId: string) {
        super(`Account ${accountId} is frozen`, 'ACCOUNT_FROZEN');
        this.name = "AccountFrozenError"
    }
}
export class DuplicateError extends NexBankError {
    constructor(resource: string, field: string) {
        super(`${resource} with this ${field} already exists`, 'DUPLICATE_ERROR');
        this.name = "DuplicateError"
    }
}


