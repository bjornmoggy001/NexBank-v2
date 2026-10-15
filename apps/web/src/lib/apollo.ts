//API Module

import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    from,
    ApolloLink,
} from '@apollo/client';
import {onError} from "@apollo/client/link/error";


const httpLink = createHttpLink({
    uri: 'http://localhost:4000/graphql',
    credentials: "include"
})

const authLink = new ApolloLink((operation, forward) =>{
    const token = getAccessToken()
    if(token){
        operation.setContext({
            headers:{
                Authorization: `Bearer ${token}`
            }
        })
    }
    return forward(operation);
})

const errorLink = onError(({graphQLErrors, operation, forward}) => {
    if (graphQLErrors) {
        for( const err of graphQLErrors ){
            if(err?.extensions.code === "FORBIDDEN"){
                return refreshAndRetry(operation, forward);
            }
        }
    }
})

//Token storage
//the access token lives in memory only, not localStorage, not sessionStorage, this prevents XSS
let _accessToken: string | null = null;

//get the token
export function getAccessToken(): string | null {
    return _accessToken;
}

//set the token
export function setAccessToken(token: string): void{
    _accessToken = token;
}

//clear the token
export function clearAccessToken(): void{
    _accessToken = null;
}

//The Silent token refresh
import {Observable} from '@apollo/client'
import {REFRESH_TOKEN_MUTATION} from './queries.js'
import type {RefreshTokenData} from './auth-context.jsx'
function refreshAndRetry(operation: any, forward:any){
    return new Observable(observer => {
        client
            .mutate<RefreshTokenData>({mutation: REFRESH_TOKEN_MUTATION})
            .then(({data})=>{
                const newToken = data?.refreshToken?.accessToken;
                if(newToken){
                    setAccessToken(newToken);
                    //recall the failed operation again
                    operation.setContext({
                        header: {
                            Authorization: `Bearer ${newToken}`
                        }
                    });
                    //forward the operation as a new observer
                    forward(operation).subscribe(observer);
                }else{
                    //clear the access token and redirect to log in
                    clearAccessToken()
                    window.location.href="/app/login"
                }
            })
            .catch(()=>{
                clearAccessToken()
                window.location.href="/app/login"
            })
    })
}

//Client
export const client = new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
        typePolicies:{
            Account:{
                keyFields:['id']
            }
        }
    }),
})



