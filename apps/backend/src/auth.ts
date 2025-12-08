import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins"
import {prismaAdapter} from "better-auth/adapters/prisma";
import { prisma } from './db'


export const auth = betterAuth({
    trustedOrigins: [
        "http://localhost:3001",
        "http://lix.localhost",
        "https://lix.localhost",
        "https://lix.florianbieck.com"
    ],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [admin()]
});