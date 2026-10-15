import { gql } from '@apollo/client'

// Auth

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
    }
  }
`

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      accessToken
    }
  }
`

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`

//  Accounts

export const MY_ACCOUNTS_QUERY = gql`
  query MyAccounts {
    myAccounts {
      id
      accountNumber
      type
      currency
      status
      nickname
      isDefault
      balanceCents
      balanceFormatted
      createdAt
    }
  }
`
export const LOOKUP_ACCOUNT_QUERY = gql`
    query LookupAccount($accountNumber: String!) {
        lookupAccount(accountNumber: $accountNumber) {
            id
            accountNumber
            currency
            ownerName
        }
    }
`


export const CREATE_ACCOUNT_MUTATION = gql`
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id
      accountNumber
      type
      currency
      balanceCents
      balanceFormatted
      isDefault
    }
  }
`



// ─── Transfers ────────────────────────────────────────────────────────────────

export const TRANSFER_MUTATION = gql`
  mutation Transfer($input: TransferInput!) {
    transfer(input: $input) {
      reference
      amountCents
      currency
      description
      createdAt
    }
  }
`

export const TRANSFER_HISTORY_QUERY = gql`
  query TransferHistory($accountId: ID!, $page: Int, $pageSize: Int) {
    transferHistory(accountId: $accountId, page: $page, pageSize: $pageSize) {
      transfers {
          id
          reference
          fromAccountId
          toAccountId
          fromAccountNumber
          toAccountNumber
          senderName
          recipientName
          amountCents
          currency
          note
          status
          createdAt
      }
      total
      page
      pageSize
    }
  }
`