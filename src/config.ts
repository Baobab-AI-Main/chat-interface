const env = import.meta.env;

const getString = (value: string | boolean | undefined): string =>
  typeof value === "string" ? value.trim() : "";

export const appConfig = {
    automationEndpoint: getString(env.VITE_n8n_ENDPOINT),
    brandFallbackName: getString(env.VITE_BRAND_FALLBACK_NAME),
    brandLogoUrl: getString(env.VITE_BRAND_LOGO_URL),
    financeCurrencySymbol: getString(env.VITE_FINANCE_CURRENCY_SYMBOL),
    chatInputPlaceholder: getString(env.VITE_CHAT_INPUT_PLACEHOLDER),
} as const;
