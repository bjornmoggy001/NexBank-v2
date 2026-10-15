// hooks/useTransfer.ts
import { useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { useLocation, useNavigate } from 'react-router-dom'
import { TRANSFER_MUTATION, LOOKUP_ACCOUNT_QUERY, MY_ACCOUNTS_QUERY } from '../lib/queries.js'
import { getAccounts } from './getAccounts'

export type TransferState = 'form' | 'confirm' | 'loading' | 'success' | 'error'

export interface AccountLookup {
    id: string
    accountNumber: string
    currency: string
    ownerName: string
}

export function useTransfer() {
    const location = useLocation()
    const navigate = useNavigate()
    const defaultAccountId = (location.state as { fromAccountId?: string } | null)?.fromAccountId

    const { accounts, loading: accountsLoading, error: accountsError } = getAccounts()
    console.log("user's accounts: ", accounts)

    // ── Form state ──
    const [fromAccountId, setFromAccountId] = useState('')
    const [recipientNumber, setRecipientNumber] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    // ── UI state ──
    const [transferState, setTransferState] = useState<TransferState>('form')
    const [resolvedRecipient, setResolvedRecipient] = useState<AccountLookup | null>(null)
    const [successReference, setSuccessReference] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    // ── GraphQL — ALL hooks now live unconditionally at the top ──
    const [lookupAccount, { loading: lookupLoading }] = useLazyQuery(LOOKUP_ACCOUNT_QUERY)
    const [transfer] = useMutation(TRANSFER_MUTATION, {
        refetchQueries: [{ query: MY_ACCOUNTS_QUERY }],
    })

    useEffect(() => {
        if (fromAccountId || accounts.length === 0) return
        setFromAccountId(
            defaultAccountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0].id
        )
    }, [accounts, defaultAccountId, fromAccountId])

    // ── Derived values ──
    const fromAccount = accounts.find((a) => a.id === fromAccountId)
    const amountCents = Math.round(parseFloat(amount || '0') * 100)

    // ── Handlers ──
    async function handleRecipientBlur() {
        if (!recipientNumber.trim()) return
        const { data } = await lookupAccount({ variables: { accountNumber: recipientNumber.trim() } })
        if (data?.lookupAccount) {
            console.log("Resolved Recipient data:", data.lookupAccount)
            setResolvedRecipient(data.lookupAccount)
            setErrors((e) => ({ ...e, recipient: '' }))
        } else {
            setResolvedRecipient(null)
            setErrors((e) => ({ ...e, recipient: 'Account not found' }))
        }
    }


    function handleReview() {
        const newErrors: Record<string, string> = {}
        if (!fromAccountId) newErrors.from = 'Select a source account'
        if (!resolvedRecipient) newErrors.recipient = 'Enter a valid recipient account'
        if (!amount || isNaN(parseFloat(amount))) newErrors.amount = 'Enter a valid amount'
        if (parseFloat(amount) <= 0) newErrors.amount = 'Amount must be greater than zero'
        if (amountCents < 100) newErrors.amount = 'Minimum transfer is KES 1.00'
        if (resolvedRecipient?.accountNumber === fromAccount?.accountNumber) {
            newErrors.recipient = 'Cannot transfer to your own account'
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }
        setErrors({})
        setTransferState('confirm')
    }

    async function handleConfirm() {
        setTransferState('loading')
        try {
            const { data } = await transfer({
                variables: {
                    input: {
                        fromAccountId,
                        toAccountId: resolvedRecipient!.id,
                        amountCents: amountCents.toString(),
                        currency: fromAccount!.currency,
                        note: note || undefined,
                    },
                },
            })
            setSuccessReference(data.transfer.reference)
            setTransferState('success')
        } catch (err: unknown) {
            const raw = err instanceof Error ? err.message : ''

            let message = 'Transfer failed. Please try again.'

            if (raw.includes('INSUFFICIENT_FUNDS') || raw.includes('Insufficient funds')) {
                message = 'You don\'t have enough funds in this account for this transfer.'
            } else if (raw.includes('ACCOUNT_FROZEN')) {
                message = 'This account is frozen. Please contact support.'
            } else if (raw.includes('Currency mismatch')) {
                message = 'You can only transfer between accounts with the same currency.'
            }

            setErrorMessage(message)
            setTransferState('error')
        }
    }

    return {
        // account data
        accounts, accountsLoading, accountsError, fromAccount,
        // form state
        fromAccountId, setFromAccountId,
        recipientNumber, setRecipientNumber,
        amount, setAmount,
        note, setNote,
        errors,
        // ui state
        transferState, setTransferState,
        resolvedRecipient, setResolvedRecipient,
        successReference, errorMessage,
        lookupLoading,
        // handlers
        handleRecipientBlur, handleReview, handleConfirm,
        navigate,
    }
}