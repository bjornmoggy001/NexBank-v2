import {useState} from "react";
import {useAuth} from "../../lib/auth-context";
import {Link} from "react-router-dom";
import {useLogin} from "../../hooks/useLogin";
import {HidePassword, ShowPassword} from "../../ui/PasswordUtils.jsx"
import AuthLayout from "./AuthLayout.jsx";

const LoginPage = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const auth = useAuth()

    const {login, loading, error} = useLogin()

    const handleSubmit = async(e:React.FormEvent) => {
        e.preventDefault()
        await login({email, password})
    }

    return (
        <AuthLayout
            eyebrow="NexBank"
            title="Welcome back."
            subtitle="Sign in to check your balance, move money, and pick up where you left off."
        >
            <h1 className="font-poppins font-semibold text-gradient text-[28px] leading-[34px] mb-6">
                Log in
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                />
                <div className='relative w-full'>
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                        rounded-[10px] px-4 py-3 outline-none border border-white/10
                        focus:border-secondary transition-colors"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dimWhite hover:text-white transition-colors cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <ShowPassword/> : <HidePassword/>}
                    </button>
                </div>

                {error && (
                    <p className="font-poppins text-red-400 text-[14px]">
                        {error.message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-poppins font-medium text-primary bg-secondary
                    rounded-[10px] py-3 disabled:opacity-50
                    disabled:cursor-not-allowed transition-opacity cursor-pointer"
                >
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
            </form>

            <p className="font-poppins text-dimWhite text-[14px] text-center mt-6">
                Don't have an account?{' '}
                <Link to="/app/register" className="text-secondary">
                    Register
                </Link>
            </p>
        </AuthLayout>
    )
}

export default LoginPage