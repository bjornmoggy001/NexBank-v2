import {
    createContext,
    useState,
    useEffect,
    useCallback,
    useContext,
    type ReactNode
} from "react";
import {LOGOUT_MUTATION, REFRESH_TOKEN_MUTATION} from "./queries";
import {useMutation} from "@apollo/client/react";
import {clearAccessToken, setAccessToken, client} from "./apollo";
import {parseJwtPayload} from "../utils/jwt";


export interface AuthUser{
    userId: string;
    role: string;
}
export interface RefreshTokenData{
    refreshToken:{
        accessToken: string;
    }
}
export interface LoginData{
    login:{
        accessToken: string;
    }
}

interface AuthContextValue{
    user: AuthUser | null;
    isLoading: boolean;
    login: (accessToken: string) => void;
    logout: () => Promise<void>;
}

//declare the context
export const AuthContext = createContext<AuthContextValue | null>(null);

//Declare provider
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [logoutMutation] = useMutation<LoginData>(LOGOUT_MUTATION)
    const [refreshMutation] = useMutation<RefreshTokenData>(REFRESH_TOKEN_MUTATION)

    //onMount, attempt a silent token refresh
    useEffect(() => {
        refreshMutation()
            .then(({data}) => {
                const token = data?.refreshToken?.accessToken;
                if(token){
                    setAccessToken(token)

                    //then decode the payload to get the userId and role
                    const payload = parseJwtPayload(token);
                    setUser({userId: payload.userId, role: payload.role});
                }
            })
            .catch(()=>{})//assume they are not logged in
            .finally(()=>{
                setIsLoading(false);
            })
    }, []);

    //handle login context
    const login = useCallback((accessToken: string) => {
        setAccessToken(accessToken)
        const payload = parseJwtPayload(accessToken)
        setUser({ userId: payload.userId, role: payload.role })
    }, [])

    //handle logout context
    const logout = useCallback(async()=>{
        try{
            await logoutMutation();
        }finally {
            clearAccessToken()
            setUser(null);
            //clear apollo cache store
            await client.clearStore
        }
    },[])
    return (
        <AuthContext.Provider value={{user, isLoading,login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}
//hook
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}

