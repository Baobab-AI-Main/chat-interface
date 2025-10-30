export function formatTitle(rawTitle: string): string {
  const trimmed = (rawTitle ?? "").trim();
  if (!trimmed) {
    return "Untitled conversation";
  }

  if (trimmed.length <= 30) {
    return trimmed;
  }

  return `${trimmed.slice(0, 27)}...`;
}
