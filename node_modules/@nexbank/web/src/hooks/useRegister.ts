import {useMutation} from '@apollo/client/react'
import {REGISTER_MUTATION} from "../lib/queries";
import {setAccessToken} from "../lib/apollo";
import {useAuth} from "../lib/auth-context";
import {useNavigate} from "react-router-dom";

export interface RegisterInput{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
}

export function useRegister(){
    const [mutate, {loading, error}] = useMutation(REGISTER_MUTATION);
    const auth = useAuth();
    const navigate = useNavigate();

    const register = async (input: RegisterInput) => {
        try{
            //execute graphQl mutation
            const {data} = await mutate({
                variables: {input}
            });
            //extract access token
            const accessToken = data.register.accessToken;

            if(accessToken){
                //store access token
                setAccessToken(accessToken);
                //update React auth context
                auth.login(accessToken);
                //redirect user
                navigate("/app/dashboard");
            }

        }catch{

        }
    };
    return {register, loading, error}
}