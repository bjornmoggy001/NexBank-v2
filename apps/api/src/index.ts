import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { typeDefs } from './schema/index.js'
import { resolvers } from './resolvers/index.js'
import { createContext } from './context.js'
import { prisma } from './db/prisma.js'
import { NexBankError } from './utils/errors.js'

// cookie-parser middleware so req.cookies is populated
// (needed for reading the refresh token httpOnly cookie)
// Install it: npm install cookie-parser && npm install --save-dev @types/cookie-parser

async function bootstrap() {
    const app = express()

    app.use(cors({
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
        credentials: true,  // required for cookies to be sent cross-origin
    }))

    app.use(express.json())
    app.use(cookieParser())

    // Create Apollo Server with our schema and resolvers
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (formattedError, error) => {
            // If it's one of our domain errors, surface the code and message
            if (error instanceof NexBankError) {
                return {
                    message: error.message,
                    extensions: {
                        code: error.code,
                    },
                }
            }
            // For unexpected errors in production, don't leak internals
            if (process.env.NODE_ENV === 'production') {
                return { message: 'Internal server error', extensions: { code: 'INTERNAL_ERROR' } }
            }
            return formattedError
        },
    })

    await server.start()

    // Mount Apollo at /graphql
    app.use('/graphql', expressMiddleware(server, {
        context: createContext,
    }))

    // Health check endpoint — used by load balancers and monitoring
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    await prisma.$connect()
    console.log('✓ Database connected')

    const port = process.env.PORT ?? 4000
    app.listen(port, () => {
        console.log(`✓ NexBank API running at http://localhost:${port}/graphql`)
        console.log(`✓ Health check at http://localhost:${port}/health`)
    })
}

bootstrap().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
})