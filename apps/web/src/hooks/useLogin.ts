import {useMutation} from '@apollo/client/react'
import {LOGIN_MUTATION} from "../lib/queries";
import {useAuth} from "../lib/auth-context";
import {useNavigate} from "react-router-dom";

interface LoginInput{
    email: string;
    password: string;
}


export function useLogin(){
    const [mutate, {loading, error}] = useMutation(LOGIN_MUTATION);
    const auth = useAuth();
    const navigate = useNavigate();

    const login = async (input: LoginInput) => {
        try{
            //execute GraphQL mutation
            const {data} = await mutate({
                variables: ({email: input.email, password: input.password}),
            });
            //extract access token
            const accessToken = data.login.accessToken;

            if(accessToken){
                //update React auth context
                auth.login(accessToken);
                //redirect user
                navigate("/app/dashboard");
            }

        }catch(err){
            console.error("Failed to login", err.message);
        }
    };
    return {login, loading, error}
}