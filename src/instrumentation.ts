import { assertProductionConfig } from "./lib/production-config";

export function register() {
  assertProductionConfig();
}
