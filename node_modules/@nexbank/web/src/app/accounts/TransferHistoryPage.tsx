import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { TRANSFER_HISTORY_QUERY, MY_ACCOUNTS_QUERY } from '../../lib/queries.js'
import { useAuth } from '../../lib/auth-context.js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedTransfer {
    id: string
    reference: string
    fromAccountId: string
    toAccountId: string
    fromAccountNumber: string
    toAccountNumber: string
    senderName: string
    recipientName: string
    amountCents: string   // BigInt comes back as string from GraphQL
    currency: string
    note: string | null
    status: string
    createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp: string): string {
    return new Date(Number(timestamp)).toLocaleDateString('en-KE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatAmount(cents: string, currency: string): string {
    const amount = (parseInt(cents, 10) / 100).toFixed(2)
    return `${currency} ${amount}`
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({
                            transfer,
                            accountId,
                        }: {
    transfer: EnrichedTransfer
    accountId: string
}) {
    const isSent = transfer.fromAccountId === accountId
    const counterparty = isSent ? transfer.recipientName : transfer.senderName
    const formattedAmount = formatAmount(transfer.amountCents, transfer.currency)


    return (
        <div className="flex items-start justify-between px-5 py-4
                    border-b border-[#2d3548] last:border-0">
            {/* Direction indicator + details */}
            <div className="flex items-start gap-3">
                <div className={`
          mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isSent ? 'bg-red-500/10' : 'bg-green-500/10'}
        `}>
          <span className={`text-sm ${isSent ? 'text-red-400' : 'text-green-400'}`}>
            {isSent ? '↑' : '↓'}
          </span>
                </div>

                <div className="flex flex-col gap-0.5">
                    <p className="text-white font-poppins text-sm font-medium">
                        {isSent ? `Sent to ${counterparty}` : `Received from ${counterparty}`}
                    </p>
                    {transfer.note && (
                        <p className="text-dimWhite font-poppins text-xs">{transfer.note}</p>
                    )}
                    <p className="text-gray-600 font-poppins text-xs">{transfer.reference}</p>
                    <p className="text-gray-600 font-poppins text-xs">
                        {formatDate(transfer.createdAt)}
                    </p>
                </div>
            </div>

            {/* Amount */}
            <p className={`
        font-poppins text-sm font-semibold flex-shrink-0 ml-4
        ${isSent ? 'text-red-400' : 'text-green-400'}
      `}>
                {isSent ? '−' : '+'} {formattedAmount}
            </p>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function TransactionHistoryPage() {
    const { accountId } = useParams<{ accountId: string }>()
    const navigate = useNavigate()
    const [page, setPage] = useState(1)

    // Fetch account info for the header
    const { data: accountsData } = useQuery(MY_ACCOUNTS_QUERY)
    const account = accountsData?.myAccounts?.find(
        (a: { id: string }) => a.id === accountId
    )

    // Fetch transaction history — fetchPolicy: 'cache-and-network' means
    // show cached data immediately while fetching fresh data in the background.
    // Better UX than showing a spinner every time.
    const { data, loading, error, fetchMore } = useQuery(TRANSFER_HISTORY_QUERY, {
        variables: { accountId, page: 1, pageSize: PAGE_SIZE },
        skip: !accountId,
        fetchPolicy: 'cache-and-network',
    })

    const transfers: EnrichedTransfer[] = data?.transferHistory?.transfers ?? []
    const total: number = data?.transferHistory?.total ?? 0
    const hasMore = transfers.length < total

    // Load more — appends to existing list
    async function handleLoadMore() {
        const nextPage = page + 1
        await fetchMore({
            variables: { accountId, page: nextPage, pageSize: PAGE_SIZE },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) return prev
                return {
                    transferHistory: {
                        ...fetchMoreResult.transferHistory,
                        // Append new transfers to existing ones
                        transfers: [
                            ...prev.transferHistory.transfers,
                            ...fetchMoreResult.transferHistory.transfers,
                        ],
                    },
                }
            },
        })
        setPage(nextPage)
    }

    return (
        <div className="min-h-screen bg-primary px-4 py-10">
            <div className="max-w-[600px] mx-auto flex flex-col gap-4">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/app/dashboard')}
                        className="text-dimWhite hover:text-white transition-colors font-poppins text-sm"
                    >
                        ← Back
                    </button>
                </div>

                {account && (
                    <div className="flex flex-col gap-1">
                        <h1 className="font-poppins font-semibold text-white text-[24px]">
                            {account.nickname ?? account.accountNumber}
                        </h1>
                        <p className="font-poppins text-secondary text-[20px] font-bold">
                            {account.balanceFormatted}
                        </p>
                        <p className="font-poppins text-dimWhite text-[13px]">
                            {account.type} · {account.currency} · {account.accountNumber}
                        </p>
                    </div>
                )}

                {/* Transaction list */}
                <div className="bg-black-gradient rounded-[10px] overflow-hidden">
                    {loading && transfers.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-dimWhite font-poppins text-sm">
                                Loading transactions...
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-red-400 font-poppins text-sm">{error.message}</p>
                        </div>
                    )}

                    {!loading && !error && transfers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <p className="text-dimWhite font-poppins text-sm">
                                No transactions yet
                            </p>
                            <button
                                onClick={() => navigate('/app/transfer', {
                                    state: { fromAccountId: accountId }
                                })}
                                className="text-secondary font-poppins text-sm hover:opacity-80
                           transition-opacity"
                            >
                                Make your first transfer →
                            </button>
                        </div>
                    )}

                    {transfers.map((transfer) => (
                        <TransactionRow
                            key={transfer.id}
                            transfer={transfer}
                            accountId={accountId!}
                        />
                    ))}

                    {/* Load more */}
                    {hasMore && (
                        <div className="flex justify-center py-4 border-t border-[#2d3548]">
                            <button
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="text-secondary font-poppins text-sm hover:opacity-80
                           transition-opacity disabled:opacity-40"
                            >
                                {loading ? 'Loading...' : `Load more (showing ${transfers.length} of ${total})`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}