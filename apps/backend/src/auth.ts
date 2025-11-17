import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins"
import {prismaAdapter} from "better-auth/adapters/prisma";
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient();

export const auth = betterAuth({
    trustedOrigins: [
        "http://localhost:3001",
        "http://lix.localhost",
        "https://lix.localhost",
        "https://lix.florianbieck.com"
    ],
    // Ensure cookies work cross-site between https://lix.localhost and https://api-lix.localhost
    // Required because frontend and backend run on different subdomains locally via Caddy TLS
    session: {
        cookie: {
            sameSite: "none",
            secure: true,
        }
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [admin()]
});