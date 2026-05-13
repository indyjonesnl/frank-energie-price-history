export interface SeoInput {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
}

const SITE = "https://indyjonesnl.github.io";
const BASE = "/frank-energie-price-history";

export function canonical(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE}${BASE}${clean.endsWith("/") ? clean : `${clean}/`}`;
}

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  type: "website";
  siteName: string;
}

export function buildOg(input: SeoInput): OgMeta {
  return {
    title: input.title,
    description: input.description,
    url: canonical(input.path),
    type: "website",
    siteName: "Frank Energie Price History",
  };
}

const BASE_WITH_TRAILING_SLASH = `${BASE}/`;

export function withBase(path: string): string {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_WITH_TRAILING_SLASH}${trimmed}`;
}

export function isActive(currentPath: string, targetPath: string): boolean {
  // Normalize trailing slashes for safe comparison.
  const norm = (s: string) => (s.endsWith("/") ? s : `${s}/`);
  return norm(currentPath) === norm(targetPath);
}
