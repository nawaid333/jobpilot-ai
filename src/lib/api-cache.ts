export const PRIVATE_API_CACHE_CONTROL = "private, no-store, max-age=0";

export function setPrivateApiCacheHeaders(headers: Headers): void {
  headers.set("Cache-Control", PRIVATE_API_CACHE_CONTROL);
}
