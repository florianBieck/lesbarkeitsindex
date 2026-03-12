import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { createApp } from "./app";
import { prisma } from "./db";
import { auth } from "./auth";

const app = createApp();

async function request(path: string, options?: RequestInit) {
    return app.handle(new Request(`http://localhost${path}`, options));
}

async function requestJSON(path: string, options?: RequestInit) {
    const res = await request(path, options);
    const body = await res.text();
    try {
        return { status: res.status, body: JSON.parse(body), headers: res.headers };
    } catch {
        return { status: res.status, body, headers: res.headers };
    }
}

let testConfigId: string | undefined;
let authCookie: string | undefined;

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = "#TestPassword1234";

beforeAll(async () => {
    // Create a test user for auth-protected routes
    await auth.api.createUser({
        body: {
            name: "Test User",
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            role: "admin",
        },
    });

    // Sign in via the app handler to get session cookie
    const signInRes = await app.handle(
        new Request("http://localhost/api/auth/sign-in/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            }),
        })
    );

    const setCookieHeader = signInRes.headers.getSetCookie?.() ?? [];
    if (setCookieHeader.length > 0) {
        authCookie = setCookieHeader.join("; ");
    } else {
        const single = signInRes.headers.get("set-cookie");
        if (single) authCookie = single;
    }

    // Ensure a config exists for /calculate tests
    const existingConfig = await prisma.config.findFirst({
        orderBy: { createdAt: "desc" },
    });
    if (!existingConfig) {
        const config = await prisma.config.create({
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
                parameterProportionOfWordsWithRareGraphemes: 0.05,
            },
        });
        testConfigId = config.id;
    }
});

afterAll(async () => {
    // Clean up test data
    if (testConfigId) {
        await prisma.result.deleteMany({ where: { configId: testConfigId } });
        await prisma.config.delete({ where: { id: testConfigId } }).catch(() => {});
    }

    // Clean up test user sessions/accounts
    const testUser = await prisma.user.findFirst({
        where: { email: TEST_EMAIL },
    });
    if (testUser) {
        await prisma.session.deleteMany({ where: { userId: testUser.id } });
        await prisma.account.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
    }
});

describe("GET /", () => {
    test("returns health check response", async () => {
        const res = await request("/");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("Hello World");
    });
});

describe("GET /config", () => {
    test("returns the latest config", async () => {
        const { status, body } = await requestJSON("/config");
        expect(status).toBe(200);
        expect(body).toHaveProperty("id");
        expect(body).toHaveProperty("parameterLix");
    });
});

describe("POST /config", () => {
    test("returns 401 without authentication", async () => {
        const res = await request("/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parameterLix: 0.7,
                parameterProportionOfWordsWithComplexSyllables: 0.1,
                parameterProportionOfWordsWithMultiMemberedGraphemes: 0.05,
                parameterProportionOfWordsWithRareGraphemes: 0.05,
                parameterProportionOfWordsWithConsonantClusters: 0.1,
            }),
        });
        expect(res.status).toBe(401);
    });

    test("creates config when authenticated", async () => {
        if (!authCookie) {
            console.warn("Skipping auth test: no auth cookie available");
            return;
        }
        const { status, body } = await requestJSON("/config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookie,
            },
            body: JSON.stringify({
                parameterLix: 0.7,
                parameterProportionOfWordsWithComplexSyllables: 0.1,
                parameterProportionOfWordsWithMultiMemberedGraphemes: 0.05,
                parameterProportionOfWordsWithRareGraphemes: 0.05,
                parameterProportionOfWordsWithConsonantClusters: 0.1,
            }),
        });
        expect(status).toBe(200);
        expect(body).toHaveProperty("id");
        expect(body.parameterLix).toBeDefined();

        // Clean up
        await prisma.config.delete({ where: { id: body.id } }).catch(() => {});
    });

    test("rejects invalid body", async () => {
        if (!authCookie) return;
        const res = await request("/config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookie,
            },
            body: JSON.stringify({ parameterLix: "not a number" }),
        });
        expect(res.status).toBe(422);
    });
});

describe("POST /calculate", () => {
    test("calculates readability for German text", async () => {
        const { status, body } = await requestJSON("/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "Die Kinder spielen im Garten. Der Hund schläft unter dem Baum.",
            }),
        });
        expect(status).toBe(200);
        expect(body).toHaveProperty("lix");
        expect(body).toHaveProperty("gsmog");
        expect(body).toHaveProperty("fleschKincaid");
        expect(body).toHaveProperty("wst4");
        expect(body).toHaveProperty("score");
        expect(body).toHaveProperty("countWords");
        expect(body).toHaveProperty("countPhrases");
        expect(body).toHaveProperty("words");
        expect(body).toHaveProperty("phrases");
        expect(body).toHaveProperty("text");
        expect(body).toHaveProperty("config");

        // Clean up created result
        if (body.id) {
            await prisma.result.delete({ where: { id: body.id } }).catch(() => {});
        }
    });

    test("rejects request without text", async () => {
        const res = await request("/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        expect(res.status).toBe(422);
    });
});

describe("GET /results", () => {
    let createdResultId: string | undefined;

    beforeAll(async () => {
        // Ensure at least one result exists
        const config = await prisma.config.findFirst({
            orderBy: { createdAt: "desc" },
        });
        if (config) {
            const { status, body } = await requestJSON("/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: "Ein einfacher Testsatz für die Ergebnisse.",
                }),
            });
            if (status === 200 && body.id) {
                createdResultId = body.id;
            }
        }
    });

    afterAll(async () => {
        if (createdResultId) {
            await prisma.result.delete({ where: { id: createdResultId } }).catch(() => {});
        }
    });

    test("returns paginated results", async () => {
        const { status, body } = await requestJSON("/results?page=0&limit=10");
        expect(status).toBe(200);
        expect(body).toHaveProperty("data");
        expect(body).toHaveProperty("meta");
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.meta).toHaveProperty("total");
        expect(body.meta).toHaveProperty("page");
        expect(body.meta).toHaveProperty("limit");
        expect(body.meta).toHaveProperty("totalPages");
    });

    test("respects pagination parameters", async () => {
        const { status, body } = await requestJSON("/results?page=0&limit=1");
        expect(status).toBe(200);
        expect(body.data.length).toBeLessThanOrEqual(1);
        expect(body.meta.limit).toBe(1);
    });

    test("uses default pagination values", async () => {
        const { status, body } = await requestJSON("/results");
        expect(status).toBe(200);
        expect(body.meta.page).toBe(0);
        expect(body.meta.limit).toBe(10);
    });

    test("results include config relation", async () => {
        const { status, body } = await requestJSON("/results?page=0&limit=1");
        expect(status).toBe(200);
        if (body.data.length > 0) {
            expect(body.data[0]).toHaveProperty("config");
            expect(body.data[0].config).toHaveProperty("id");
        }
    });
});
