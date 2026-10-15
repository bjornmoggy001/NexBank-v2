import {MY_ACCOUNTS_QUERY} from "../lib/queries";
import {useQuery} from '@apollo/client/react';

export type Currency = 'KES'| 'EUR' | 'USD'
export type AccountType = 'CHECKING' | 'SAVINGS'


interface Account{
    id: string;
    type: AccountType;
    currency: Currency;
    nickname: string;
    balanceFormatted: string
}

export function getAccounts(){
    const {data, loading, error} = useQuery<{myAccounts:Account[]}>(MY_ACCOUNTS_QUERY)
    
    const accounts = data?.myAccounts ?? []
    console.log(accounts)
    return {
        accounts,
        loading,
        error,
    }
}