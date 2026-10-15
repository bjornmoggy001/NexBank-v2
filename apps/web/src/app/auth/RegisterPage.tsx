import {useState} from "react";
import {Link} from "react-router-dom";
import { countries } from 'countries-list';
import {useRegister} from "../../hooks/useRegister";
import {HidePassword, ShowPassword} from "../../ui/PasswordUtils.jsx";
import AuthLayout from "./AuthLayout.jsx";

const countryOptions = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name
})).sort((a, b) => a.name.localeCompare(b.name));

const RegisterPage = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState("");
    const [country, setCountry] = useState("KE");

    const {register, loading, error} = useRegister()

    const handleSubmit = async(e:React.FormEvent) => {
        e.preventDefault()
        await register({
            firstName,
            lastName,
            email,
            password,
            phone: phone?.trim() ? phone : undefined,
            country: country || undefined
        })
    }

    return (
        <AuthLayout
            eyebrow="NexBank"
            title="Join NexBank."
            subtitle="Open an account in minutes and start managing your money the easy way."
        >
            <h1 className="font-poppins font-semibold text-gradient text-[28px] leading-[34px] mb-6">
                Create your account
            </h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5 w-full">
                <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                />
                <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                />
                <input
                    type="email"
                    required
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-2 w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                />
                <div className='col-span-2 relative w-full'>
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
                <input
                    type="tel"
                    placeholder="0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="col-span-2 w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                />
                <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="col-span-2 w-full font-poppins bg-black-gradient text-white placeholder:text-dimWhite
                    rounded-[10px] px-4 py-3 outline-none border border-white/10
                    focus:border-secondary transition-colors"
                >
                    {countryOptions.map((c)=>(
                        <option key={c.code} value={c.code} className='bg-primary text-white'>{c.name}</option>
                    ))}
                </select>

                {error && (
                    <p className="col-span-2 font-poppins text-red-400 text-[14px]">
                        {error.message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full col-span-2 font-poppins font-medium text-primary bg-secondary
                    rounded-[10px] py-3 disabled:opacity-50
                    disabled:cursor-not-allowed transition-opacity cursor-pointer"
                >
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>

            <p className="font-poppins text-dimWhite text-[14px] text-center mt-6">
                Already have an account?{' '}
                <Link to="/app/login" className="text-secondary">
                    Log in
                </Link>
            </p>
        </AuthLayout>
    )
}

export default RegisterPage