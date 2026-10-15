import { useNavigate } from 'react-router-dom'
import { getAccounts } from '../../hooks/getAccounts.js'

export default function DashboardPage() {
    const { accounts, loading, error } = getAccounts()
    const navigate = useNavigate()

    if (loading) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <p className="font-poppins text-white">Loading accounts...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <p className="font-poppins text-red-400">{error.message}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-primary px-4 py-10">
            <div className="max-w-[600px] mx-auto flex flex-col gap-4">
                <h1 className="font-poppins font-semibold text-white text-[28px]">Your Accounts</h1>

                {accounts.map((account) => (
                    <div
                        key={account.id}
                        className="bg-black-gradient rounded-[10px] px-4 py-3 flex justify-between items-center"
                    >
                        <div>
                            <p
                                className="font-poppins text-white text-[16px] cursor-pointer hover:text-secondary
                                transition-colors"
                                onClick={() => navigate(`/app/accounts/${account.id}`)}
                            >
                                {account.nickname || account.type}
                            </p>
                            <p className="font-poppins text-dimWhite text-[13px]">
                                {account.type} · {account.currency}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <p className="font-poppins text-secondary text-[16px] font-medium">
                                {account.balanceFormatted}
                            </p>
                            <button
                                onClick={() => navigate('/app/transfer', { state: { fromAccountId: account.id } })}
                                className="font-poppins text-primary bg-secondary text-sm font-medium
                           rounded-[8px] px-3 py-2 hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                Send Money
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}