interface AccessTokenPayload{
    userId: string;
    role: string;
    iat: number;
    exp: number;
}

export function parseJwtPayload(token: string): AccessTokenPayload | null {
    try {
        const payloadSegment = token.split('.')[1];
        if (!payloadSegment) return null;

        const base64Payload = payloadSegment
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padNeeded = (4 - base64Payload.length % 4) % 4;
        const paddedPayload = base64Payload.padEnd(base64Payload.length + padNeeded, "=");

        const jsonPayload = atob(paddedPayload)
        return JSON.parse(jsonPayload) as AccessTokenPayload;
    } catch {
        return null;
    }
}