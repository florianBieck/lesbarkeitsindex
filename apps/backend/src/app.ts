import { Elysia, t } from "elysia";
import { auth } from "./auth";
import { prisma } from './db'
import { cors } from '@elysiajs/cors'
import {calculateIndex} from "./result";


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

export function createApp() {
    return new Elysia()
        .use(cors({
            origin: true,
            credentials: true,
        }))
        .use(betterAuth)
        .get("/", () => "Hello World")
        .get("/config", async ({ status }) => {
            const config = await prisma.config.findFirst({
                orderBy: {
                    createdAt: 'desc'
                }
            });
            if (!config) return status(404);
            return config;
        })
        .post("/config", async ({ body, status, user }) => {
            return prisma.config.create({
                data: {
                    parameterCountWords: 0,
                    parameterCountPhrases: 0,
                    parameterCountMultipleWords: 0,
                    parameterCountWordsWithComplexSyllables: 0,
                    parameterCountWordsWithConsonantClusters: 0,
                    parameterCountWordsWithMultiMemberedGraphemes: 0,
                    parameterCountWordsWithRareGraphemes: 0,
                    parameterAverageWordLength: 0,
                    parameterAveragePhraseLength: 0,
                    parameterAverageSyllablesPerWord: 0,
                    parameterAverageSyllablesPerPhrase: 0,
                    parameterProportionOfLongWords: 0,
                    parameterLix: body.parameterLix,
                    parameterProportionOfWordsWithComplexSyllables: body.parameterProportionOfWordsWithComplexSyllables,
                    parameterProportionOfWordsWithConsonantClusters: body.parameterProportionOfWordsWithConsonantClusters,
                    parameterProportionOfWordsWithMultiMemberedGraphemes: body.parameterProportionOfWordsWithMultiMemberedGraphemes,
                    parameterProportionOfWordsWithRareGraphemes: body.parameterProportionOfWordsWithRareGraphemes,
                },
            });
        }, {
            body: t.Object({
                parameterLix: t.Number(),
                parameterProportionOfWordsWithComplexSyllables: t.Number(),
                parameterProportionOfWordsWithMultiMemberedGraphemes: t.Number(),
                parameterProportionOfWordsWithRareGraphemes: t.Number(),
                parameterProportionOfWordsWithConsonantClusters: t.Number(),
            }),
            auth: true
        })
        .post("/calculate", async ({ body, status }) => {
            const config = await prisma.config.findFirst({
                orderBy: {
                    createdAt: 'desc'
                }
            });
            if (!config) return status(500);
            const result = await calculateIndex(body.text, config);
            if (!result) return status(500);
            return result;
        }, {
            body: t.Object({
                text: t.String()
            })
        })
        .get("/results", async ({ query: { page = 0, limit = 10 } }) => {
            const [data, total] = await Promise.all([
                prisma.result.findMany({
                    skip: page * limit,
                    take: limit,
                    include: {
                        config: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.result.count()
            ]);

            return {
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }, {
            query: t.Object({
                page: t.Optional(t.Numeric()),
                limit: t.Optional(t.Numeric())
            })
        });
}
