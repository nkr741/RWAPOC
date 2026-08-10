declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASE_URL?: string;
      API_URL?: string;
      QA_USER?: string;
      QA_PASSWORD?: string;
      CI?: string;
    }
  }
}
export {};
