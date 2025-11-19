-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parameterCountWords" DECIMAL(65,30) NOT NULL,
    "parameterCountPhrases" DECIMAL(65,30) NOT NULL,
    "parameterCountMultipleWords" DECIMAL(65,30) NOT NULL,
    "parameterCountWordsWithComplexSyllables" DECIMAL(65,30) NOT NULL,
    "parameterCountWordsWithConsonantClusters" DECIMAL(65,30) NOT NULL,
    "parameterCountWordsWithMultiMemberedGraphemes" DECIMAL(65,30) NOT NULL,
    "parameterCountWordsWithRareGraphemes" DECIMAL(65,30) NOT NULL,
    "parameterAverageWordLength" DECIMAL(65,30) NOT NULL,
    "parameterAveragePhraseLength" DECIMAL(65,30) NOT NULL,
    "parameterAverageSyllablesPerWord" DECIMAL(65,30) NOT NULL,
    "parameterAverageSyllablesPerPhrase" DECIMAL(65,30) NOT NULL,
    "parameterProportionOfLongWords" DECIMAL(65,30) NOT NULL,
    "parameterLix" DECIMAL(65,30) NOT NULL,
    "parameterProportionOfWordsWithComplexSyllables" DECIMAL(65,30) NOT NULL,
    "parameterProportionOfWordsWithConsonantClusters" DECIMAL(65,30) NOT NULL,
    "parameterProportionOfWordsWithMultiMemberedGraphemes" DECIMAL(65,30) NOT NULL,
    "parameterProportionOfWordsWithRareGraphemes" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countWords" DECIMAL(65,30) NOT NULL,
    "countPhrases" DECIMAL(65,30) NOT NULL,
    "countMultipleWords" DECIMAL(65,30) NOT NULL,
    "countWordsWithComplexSyllables" DECIMAL(65,30) NOT NULL,
    "countWordsWithConsonantClusters" DECIMAL(65,30) NOT NULL,
    "countWordsWithMultiMemberedGraphemes" DECIMAL(65,30) NOT NULL,
    "countWordsWithRareGraphemes" DECIMAL(65,30) NOT NULL,
    "averageWordLength" DECIMAL(65,30) NOT NULL,
    "averagePhraseLength" DECIMAL(65,30) NOT NULL,
    "averageSyllablesPerWord" DECIMAL(65,30) NOT NULL,
    "averageSyllablesPerPhrase" DECIMAL(65,30) NOT NULL,
    "proportionOfLongWords" DECIMAL(65,30) NOT NULL,
    "proportionOfWordsWithComplexSyllables" DECIMAL(65,30) NOT NULL,
    "proportionOfWordsWithConsonantClusters" DECIMAL(65,30) NOT NULL,
    "proportionOfWordsWithMultiMemberedGraphemes" DECIMAL(65,30) NOT NULL,
    "proportionOfWordsWithRareGraphemes" DECIMAL(65,30) NOT NULL,
    "lix" DECIMAL(65,30) NOT NULL,
    "ratte" DECIMAL(65,30) NOT NULL,
    "ratteLevel" DECIMAL(65,30) NOT NULL,
    "gsmog" DECIMAL(65,30) NOT NULL,
    "wst4" DECIMAL(65,30) NOT NULL,
    "fleschKincaid" DECIMAL(65,30) NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "scoreLevel" DECIMAL(65,30) NOT NULL,
    "text" TEXT NOT NULL,
    "words" TEXT[],
    "phrases" TEXT[],
    "hashText" TEXT NOT NULL,
    "configId" TEXT NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

