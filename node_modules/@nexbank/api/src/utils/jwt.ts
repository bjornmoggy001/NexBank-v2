import jwt, {SignOptions} from 'jsonwebtoken'


//Types
export interface AccessTokenPayload {
    userId: string
    role: string
    // (issuedAt) iat and (expiry) exp are added automatically by jsonwebtoken
}

//Token generation
//First get the JWT accessToken Secret
function getAccessSecret(): string {
    const secret =  process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
    return secret;
}

//Then get the refreshToken Secret
function getRefreshSecret(): string {
    const secret =  process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
    return secret;
}

// Sign the accessToken with its secret
export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, getAccessSecret(),{
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'],
    });
}

//Sign the refresh token
export function signRefreshToken(userId: string): string{
    return jwt.sign(userId, getRefreshSecret(), {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'],
    })
}

//TOKEN VERIFICATION
export function verifyAccessToken(token: string | undefined): AccessTokenPayload{
    return jwt.verify(token, getAccessSecret()) as AccessTokenPayload
}
export function verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, getRefreshSecret()) as { userId: string }
}