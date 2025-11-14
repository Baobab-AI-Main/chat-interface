const env = import.meta.env;

const getString = (value: string | boolean | undefined): string =>
  typeof value === "string" ? value.trim() : "";

const getNumber = (value: string | boolean | undefined): number | null => {
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const appConfig = {
    automationEndpoint: getString(env.VITE_n8n_ENDPOINT),
  automationApiKey: getString(env.VITE_n8n_KEY),
    automationTimeoutMs: getNumber(env.VITE_AUTOMATION_TIMEOUT_MS) ?? 120000,
    brandFallbackName: getString(env.VITE_BRAND_FALLBACK_NAME),
    brandLogoUrl: getString(env.VITE_BRAND_LOGO_URL),
    financeCurrencySymbol: getString(env.VITE_FINANCE_CURRENCY_SYMBOL),
    chatInputPlaceholder: getString(env.VITE_CHAT_INPUT_PLACEHOLDER),
    attachmentUploadEndpoint: getString(env.VITE_ATTACHMENT_UPLOAD_ENDPOINT),
} as const;
