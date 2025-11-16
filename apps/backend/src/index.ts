import { Elysia, t } from "elysia";
import { auth } from "./auth";
import { PrismaClient } from '../generated/prisma'
import { cors } from '@elysiajs/cors'
import {Config} from "../generated/prismabox/Config";
import {Result} from "../generated/prismabox/Result";
import {calculateIndex} from "./result";
import {APIError} from "better-auth";

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
    .get("/", () => "Hello World")
    .get("/config", async ({ status }) => {
        const config = await prisma.config.findFirst();
        if (!config) return status(404);
        return config;
    })
    .post("/config", async ({ body, status, user }) => {
        const config = await prisma.config.findFirst();
        if (config) {
            return status(409);
        }
        const { results, id, ...rest } = body;
        return prisma.config.create({
            data: {
                // all scalar fields from Config except id/results
                ...rest,
                // only add results if provided
                ...(Array.isArray(results) && results.length > 0
                    ? {
                        results: {
                            create: results.map((r) => {
                                // remove configId if it exists on the type;
                                // Prisma will link it automatically via the relation
                                const { configId, ...resultRest } = r as any;
                                return {
                                    ...resultRest,
                                };
                            }),
                        },
                    }
                    : {}),
            },
        });
    }, {
        body: Config,
        auth: true
    })
    .post("/calculate", async ({ body, status }) => {
        const config = await prisma.config.findFirst();
        if (!config) return status(500);
        const result = await calculateIndex(body.text, config);
        if (!result) return status(500);
        return result;
    }, {
        body: t.Object({
            text: t.String()
        })
    })
    .listen(3000);

async function onStartup() {
    try {
        await auth.api.createUser({
            body: {
                name: "Florian Bieck",
                email: "info@florianbieck.com",
                password: "#Test1234",
                role: "admin"
            },
        });
    } catch (error) {
        if (error instanceof APIError) {
            console.log("Can be ignored: Admin Account already exists.")
        }
    }
    const config = await prisma.config.findFirst();
    if (!config) {
        const numberOfParameters = 11;
        const weightPerParameter = 1 / numberOfParameters;
        await prisma.config.create({
            data: {
                parameterSyllableComplexity: weightPerParameter,
                parameterMultiMemberedGraphemes: weightPerParameter,
                parameterRareGraphemes: weightPerParameter,
                parameterConsonantClusters: weightPerParameter,
                parameterCountWords: weightPerParameter,
                parameterAverageWordLength: weightPerParameter,
                parameterAverageSyllablesPerWord: weightPerParameter,
                parameterCountPhrases: weightPerParameter,
                parameterAveragePhraseLength: weightPerParameter,
                parameterAverageSyllablesPerPhrase: weightPerParameter,
                parameterProportionOfLongWords: weightPerParameter,
            }
        })
    } else {
        const text = "Die Lesbarkeit eines Textes wird beim klassischen LIX über die Anzahl von Wörtern und Sätzen sowie über die durchschnittliche Satzlänge und über den prozentualen Anteil langer Wörter (6 und mehr Buchstaben) berechnet. Für Leselernende spielen weitere Faktoren eine wichtige Rolle. Vor allem die Komplexität von Wörtern erleichtert oder erschwert das Lesen.";
        const result = await calculateIndex(text, config);
        console.log(result);
    }
    console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
}

onStartup();

export type App = typeof app