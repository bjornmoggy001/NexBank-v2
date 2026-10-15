
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { client } from './lib/apollo.js'
import { useAuth } from './lib/auth-context.js'
import { AuthProvider } from './lib/auth-context.js'
import MarketingHome from './marketing/MarketingHome.js'
import LoginPage from './app/auth/LoginPage.js'
import RegisterPage from './app/auth/RegisterPage.js'
import DashboardPage from './app/dashboard/DashboardPage.js'
import TransferPage from "./app/transfer/TransferPage"
import TransferHistoryPage from './app/accounts/TransferHistoryPage'

// ProtectedRoute component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="text-white font-poppins">Loading...</div>
            </div>
        )
    }

    if (!user) return <Navigate to="/app/login" replace />
    return <>{children}</>
}
export default function App() {
    return (
        <ApolloProvider client={client}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<MarketingHome />} />
                        <Route path="/app/login" element={<LoginPage />} />
                        <Route path="/app/register" element={<RegisterPage />} />
                        <Route
                            path="/app/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/app/transfer"
                            element={
                                <ProtectedRoute>
                                    <TransferPage/>
                                </ProtectedRoute>
                            }
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                        <Route
                            path="/app/accounts/:accountId"
                            element={
                                <ProtectedRoute>
                                    <TransferHistoryPage />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ApolloProvider>
    )
}