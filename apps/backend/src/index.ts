import { Elysia } from "elysia";
import { auth } from "./auth";
import { PrismaClient } from '../generated/prisma'
import { cors } from '@elysiajs/cors'
import {Config} from "../generated/prismabox/Config";

const prisma = new PrismaClient();

// user middleware (compute user and session and pass to routes)
const betterAuth = new Elysia({ name: "better-auth" })
    .mount(auth.handler)
    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers,
                });

                if (!session) return status(401);

                return {
                    user: session.user,
                    session: session.session,
                };
            },
        },
    });

const app = new Elysia()
    .use(cors({
        origin: true,
        credentials: true,
    }))
    .use(betterAuth)
    .get("/", () => "Hello Elysia")
    .get("/config", async (req) => {
        const config = await prisma.config.findFirst();
        return config;
    })
    .post("/config", async ({ body }) => {
        const config = await prisma.config.create({
            data: body,
        });
        return config;
    }, {
        body: Config
    })
    .listen(3000);

async function onStartup() {
    try {
        const data = await auth.api.signUpEmail({
            body: {
                name: "Florian Bieck", // required
                email: "info@florianbieck.com", // required
                password: "#Test1234", // required
            },
        });
    } catch (error) {
        console.error(error);
    }
    finally {
        console.log(
            `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
        );
    }
}

onStartup();
