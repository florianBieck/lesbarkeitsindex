import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins"
import {prismaAdapter} from "better-auth/adapters/prisma";
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient();

export const auth = betterAuth({
    trustedOrigins: ["http://localhost:3001"],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [admin()]
});