import { auth } from "./auth";
import { prisma } from './db'
import { createApp } from "./app";
import {APIError} from "better-auth";

const app = createApp().listen(3000);

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
    try {
        await auth.api.createUser({
            body: {
                name: "Beate Lessmann",
                email: "info@beate-lessmann.de",
                password: "#Test1234",
                role: "admin"
            },
        });
    } catch (error) {
        if (error instanceof APIError) {
            console.log("Can be ignored: Admin Account already exists.")
        }
    }
    let config = await prisma.config.findFirst();
    if (!config) {
        config = await prisma.config.create({
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
                parameterLix: 0.6,
                parameterProportionOfWordsWithComplexSyllables: 0.2,
                parameterProportionOfWordsWithConsonantClusters: 0.05,
                parameterProportionOfWordsWithMultiMemberedGraphemes: 0.1,
                parameterProportionOfWordsWithRareGraphemes: 0.05
            }
        });
    }
    console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
}

onStartup();

export type App = typeof app
