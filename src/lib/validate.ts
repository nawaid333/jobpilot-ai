export function stringField(value: unknown, max: number, name: string) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`${name} is invalid`);
  return trimmed;
}

export function optionalStringField(value: unknown, max: number, name: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return stringField(value, max, name);
}

export function stringArrayField(value: unknown, maxItems: number, maxItemLength: number, name: string) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${name} is invalid`);
  return value.map((item) => stringField(item, maxItemLength, name));
}

export function safeHttpUrl(value: unknown, name: string) {
  const url = stringField(value, 2048, name);
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`${name} is invalid`); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${name} is invalid`);
  return parsed.toString();
}
