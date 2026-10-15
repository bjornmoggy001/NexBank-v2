import argon2 from 'argon2'
import crypto from 'node:crypto'

//Argon 2 parameters, to be tuned up when hardware improves
const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 1024 * 64, //64MB memory per hash
    timeCost: 3,            //3 iterations
    parallelism: 1,         //single thread consistent timing
}

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(
    hash: string,
    plaintext: string
): Promise<boolean> {
    return argon2.verify(hash, plaintext)
}

//REFRESH TOKEN HANDLING
export function generateRefreshToken(): string{
    return crypto.randomBytes(64).toString('hex')
}
// hash the refreshToken SHA-256 for db storage
export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}