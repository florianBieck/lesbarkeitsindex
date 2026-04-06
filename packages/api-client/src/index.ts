import { ofetch, type $Fetch } from 'ofetch';

export interface Config {
  id: string;
  createdAt: string;
  parameterLix: string;
  parameterProportionOfWordsWithComplexSyllables: string;
  parameterProportionOfWordsWithConsonantClusters: string;
  parameterProportionOfWordsWithMultiMemberedGraphemes: string;
  parameterProportionOfWordsWithRareGraphemes: string;
  [key: string]: unknown;
}

export interface ResultData {
  id: string;
  createdAt: string;
  countWords: string;
  countPhrases: string;
  countSyllables: string;
  countMultipleWords: string;
  countWordsWithComplexSyllables: string;
  countWordsWithConsonantClusters: string;
  countWordsWithMultiMemberedGraphemes: string;
  countWordsWithRareGraphemes: string;
  countWordsWithOneSyllable: string;
  countWordsWithTwoSyllable: string;
  countWordsWithThreeSyllable: string;
  countWordsWithFourSyllable: string;
  countWordsWithFiveSyllable: string;
  averageWordLength: string;
  averagePhraseLength: string;
  averageCharsPerSyllable: string;
  averageSyllablesPerWord: string;
  averageSyllablesPerPhrase: string;
  proportionOfLongWords: string;
  proportionOfWordsWithComplexSyllables: string;
  proportionOfWordsWithConsonantClusters: string;
  proportionOfWordsWithMultiMemberedGraphemes: string;
  proportionOfWordsWithRareGraphemes: string;
  lix: string;
  ratte: string;
  ratteLevel: string;
  gsmog: string;
  wst4: string;
  fleschKincaid: string;
  ttr: string;
  countAbbreviations: string;
  countNumbers: string;
  countNumbersTwoDigit: string;
  countNumbersThreeDigit: string;
  countNumbersFourDigit: string;
  countNumbersFivePlusDigit: string;
  countSpecialCharacters: string;
  proNIndex: string;
  subordinateClauseRatio: string;
  passiveCount: string;
  nominalizationCount: string;
  score: string;
  scoreLevel: string;
  text: string;
  words: string[];
  wordsWithOneSyllable: string[];
  wordsWithTwoSyllables: string[];
  wordsWithThreeSyllables: string[];
  wordsWithFourSyllables: string[];
  wordsWithFiveSyllables: string[];
  phrases: string[];
  syllables: string[];
  hashText: string;
  config: Config;
  configId: string;
}

export interface ResultsResponse {
  data: ResultData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CalculateRequest {
  text: string;
  saveResult?: boolean;
  parameterLix?: number;
  parameterProportionOfWordsWithComplexSyllables?: number;
  parameterProportionOfWordsWithConsonantClusters?: number;
  parameterProportionOfWordsWithMultiMemberedGraphemes?: number;
  parameterProportionOfWordsWithRareGraphemes?: number;
}

export interface UpdateConfigRequest {
  parameterLix: number;
  parameterProportionOfWordsWithComplexSyllables: number;
  parameterProportionOfWordsWithMultiMemberedGraphemes: number;
  parameterProportionOfWordsWithRareGraphemes: number;
  parameterProportionOfWordsWithConsonantClusters: number;
}

export interface ApiClient {
  getConfig(): Promise<Config>;
  updateConfig(body: UpdateConfigRequest): Promise<Config>;
  calculate(body: CalculateRequest): Promise<ResultData>;
  getResults(query?: { page?: number; limit?: number }): Promise<ResultsResponse>;
}

export function createApiClient(baseURL: string): ApiClient {
  const api: $Fetch = ofetch.create({
    baseURL,
    credentials: 'include',
  });

  return {
    getConfig: () => api('/config'),
    updateConfig: (body) => api('/config', { method: 'POST', body }),
    calculate: (body) => api('/calculate', { method: 'POST', body }),
    getResults: (query) => api('/results', { query }),
  };
}
