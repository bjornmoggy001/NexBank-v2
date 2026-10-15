import {logo} from '../../assets'
const AuthLayout = ({ eyebrow, title, subtitle, children }) => (
    <div className="min-h-screen bg-primary flex flex-col lg:flex-row">
        {/* Ribbon canvas */}
        <div className="relative lg:w-[55%] w-full lg:min-h-screen min-h-screen overflow-hidden flex flex-col items-start justify-start">
            <div className="absolute inset-0 auth-ribbon">
                <div className="absolute w-[70%] h-[70%] rounded-full blue__gradient blur-3xl opacity-60 -left-[15%] -top-[10%] ribbon-drift-1" />
                <div className="absolute w-[60%] h-[60%] rounded-full pink__gradient blur-3xl opacity-40 -right-[10%] bottom-[-15%] ribbon-drift-2" />
            </div>

            <div className="relative z-[1] p-10">
                <img
                    src={logo}
                    alt="Logo"
                />
            </div>

            <div className="relative z-[1] p-10 hidden lg:block">
                <h1 className="font-poppins font-semibold text-white text-[40px] leading-[46px] max-w-[420px]">
                    {title}
                </h1>
                <p className="font-poppins text-dimWhite text-[16px] mt-4 max-w-[380px]">
                    {subtitle}
                </p>
            </div>
        </div>

        {/* Form card */}
        <div className="relative flex-1 flex items-center justify-center p-2 lg:p-4">
            <div className="w-full max-w-[420px] bg-black-gradient backdrop-blur-md border border-white/10 rounded-[20px] p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                {children}
            </div>
        </div>
    </div>
);

export default AuthLayout;