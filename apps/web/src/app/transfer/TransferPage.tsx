import { useTransfer } from '../../hooks/useTransfer'

function InputField({ label, value, onChange, type = 'text', placeholder, error }: {
    label: string
    value: string
    onChange: (v: string) => void
    type?: string
    placeholder?: string
    error?: string
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-dimWhite text-sm font-poppins">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`bg-[#1a1f2e] border rounded-xl px-4 py-3 text-white font-poppins
          placeholder:text-gray-600 outline-none transition-colors
          ${error ? 'border-red-500 focus:border-red-400' : 'border-[#2d3548] focus:border-secondary'}`}
            />
            {error && <span className="text-red-400 text-xs font-poppins">{error}</span>}
        </div>
    )
}

export default function TransferPage() {
    const {
        accounts, accountsLoading, accountsError, fromAccount,
        fromAccountId, setFromAccountId,
        recipientNumber, setRecipientNumber,
        amount, setAmount,
        note, setNote,
        errors,
        transferState, setTransferState,
        resolvedRecipient, setResolvedRecipient,
        successReference, errorMessage,
        lookupLoading,
        handleRecipientBlur, handleReview, handleConfirm,
        navigate,
    } = useTransfer()

    if (accountsLoading) return <p className="text-white font-poppins">Loading...</p>
    if (accountsError) return <p className="text-red-400 font-poppins">{accountsError.message}</p>

    if (transferState === 'success') {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-3xl">✓</span>
                </div>
                <h2 className="text-white font-poppins font-bold text-2xl">Transfer Sent</h2>
                <p className="text-dimWhite font-poppins text-center">Your transfer was successful.</p>
                <div className="bg-[#1a1f2e] rounded-xl px-6 py-3 border border-[#2d3548]">
                    <span className="text-dimWhite font-poppins text-sm">Reference: </span>
                    <span className="text-secondary font-poppins text-sm font-semibold">{successReference}</span>
                </div>
                <button
                    onClick={() => navigate('/app/dashboard')}
                    className="bg-secondary text-primary font-poppins font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                    Back to Dashboard
                </button>
            </div>
        )
    }

    if (transferState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-3xl">✕</span>
                </div>
                <h2 className="text-white font-poppins font-bold text-2xl">Transfer Failed</h2>
                <p className="text-red-400 font-poppins text-center text-sm">{errorMessage}</p>
                <button
                    onClick={() => setTransferState('form')}
                    className="bg-secondary text-primary font-poppins font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (transferState === 'confirm') {
        return (
            <div className="flex flex-col gap-6">
                <h2 className="text-white font-poppins font-bold text-xl">Confirm Transfer</h2>
                <div className="bg-[#1a1f2e] rounded-2xl border border-[#2d3548] overflow-hidden">
                    {[
                        { label: 'From', value: fromAccount?.nickname ?? fromAccount?.accountNumber },
                        { label: 'To', value: `${resolvedRecipient?.ownerName} · ${resolvedRecipient?.accountNumber}` },
                        { label: 'Amount', value: `${fromAccount?.currency} ${parseFloat(amount).toFixed(2)}` },
                        { label: 'Note', value: note || '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center px-5 py-4 border-b border-[#2d3548] last:border-0">
                            <span className="text-dimWhite font-poppins text-sm">{label}</span>
                            <span className="text-white font-poppins text-sm font-medium">{value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-dimWhite font-poppins text-xs text-center">
                    This action cannot be undone. Please verify the details above.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setTransferState('form')}
                        className="flex-1 border border-[#2d3548] text-white font-poppins font-semibold py-3 rounded-xl hover:border-secondary transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-secondary text-primary font-poppins font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Confirm & Send
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-white font-poppins font-bold text-xl">Send Money</h2>

            <div className="flex flex-col gap-1">
                <label className="text-dimWhite text-sm font-poppins">From Account</label>
                <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="bg-[#1a1f2e] border border-[#2d3548] rounded-xl px-4 py-3 text-white font-poppins outline-none focus:border-secondary transition-colors"
                >
                    {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.nickname ?? account.accountNumber} · {account.balanceFormatted}
                        </option>
                    ))}
                </select>
                {errors.from && <span className="text-red-400 text-xs font-poppins">{errors.from}</span>}
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-dimWhite text-sm font-poppins">Recipient Account Number</label>
                <input
                    type="text"
                    value={recipientNumber}
                    onChange={(e) => {
                        setRecipientNumber(e.target.value)
                        setResolvedRecipient(null)
                    }}
                    onBlur={handleRecipientBlur}
                    placeholder="NBX-KE-XXXXXXXXXX"
                    className={`bg-[#1a1f2e] border rounded-xl px-4 py-3 text-white font-poppins
            placeholder:text-gray-600 outline-none transition-colors
            ${errors.recipient ? 'border-red-500' : resolvedRecipient ? 'border-green-500' : 'border-[#2d3548] focus:border-secondary'}`}
                />
                {lookupLoading && <span className="text-dimWhite text-xs font-poppins">Looking up account...</span>}
                {resolvedRecipient && (
                    <span className="text-green-400 text-xs font-poppins">
            ✓ {resolvedRecipient.ownerName} · {resolvedRecipient.currency} account
          </span>
                )}
                {errors.recipient && <span className="text-red-400 text-xs font-poppins">{errors.recipient}</span>}
            </div>

            <InputField
                label={`Amount (${fromAccount?.currency ?? 'KES'})`}
                value={amount}
                onChange={setAmount}
                type="number"
                placeholder="0.00"
                error={errors.amount}
            />

            <InputField label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Rent for August" />

            <button
                onClick={handleReview}
                className="bg-secondary text-primary font-poppins font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity mt-2"
            >
                Review Transfer
            </button>
        </div>
    )
}