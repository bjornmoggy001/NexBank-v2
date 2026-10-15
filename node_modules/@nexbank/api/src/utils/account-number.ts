import {accountRepository} from "../repositories/account.repository.js";

export async function generateAccountNumber(
    countryCode= 'KE'
): Promise<string> {
    const MAX_ATTEMPTS = 5;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const digits = Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000);
        const candidate = `NBX-${countryCode}-${digits}`;

        const existing = await accountRepository.findByAccountNumber(candidate);

        if (!existing) {
            return candidate;
        }
        
    }

    throw new Error(`Failed to generate unique account number after ${MAX_ATTEMPTS} attempts`);
}