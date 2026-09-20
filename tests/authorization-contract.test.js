const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const API_ROOT = path.join(process.cwd(), "src", "app", "api");
const PUBLIC_ROUTE_PREFIXES = [
  `${path.join("auth")}${path.sep}`,
  `${path.join("health")}${path.sep}`,
  `${path.join("billing", "webhook")}${path.sep}`,
  `${path.join("gmail", "callback")}${path.sep}`,
];

const AUTH_GUARD_MARKERS = [
  "getCurrentUser(",
  "requireUser(",
  "requireAuth(",
  "getSessionUser(",
];

function collectRouteFiles(directory, relative = "") {
  const routes = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      routes.push(...collectRouteFiles(absolute, nextRelative));
    } else if (entry.isFile() && entry.name === "route.ts") {
      routes.push(nextRelative);
    }
  }
  return routes;
}

function isPublicRoute(relativePath) {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

test("every user-scoped API route contains an explicit authentication guard", () => {
  const routes = collectRouteFiles(API_ROOT);
  assert.ok(routes.length > 0, "expected API route inventory to be present");

  const unguarded = routes
    .filter((route) => !isPublicRoute(route))
    .filter((route) => {
      const source = fs.readFileSync(path.join(API_ROOT, route), "utf8");
      return !AUTH_GUARD_MARKERS.some((marker) => source.includes(marker));
    });

  assert.deepEqual(
    unguarded,
    [],
    `User-scoped API routes must explicitly authenticate before accessing user data: ${unguarded.join(", ")}`,
  );
});

test("the authorization audit keeps its public-route exceptions explicit", () => {
  assert.ok(PUBLIC_ROUTE_PREFIXES.includes(`${path.join("auth")}${path.sep}`));
  assert.ok(PUBLIC_ROUTE_PREFIXES.includes(`${path.join("health")}${path.sep}`));
  assert.ok(PUBLIC_ROUTE_PREFIXES.includes(`${path.join("gmail", "callback")}${path.sep}`));
  assert.ok(PUBLIC_ROUTE_PREFIXES.includes(`${path.join("billing", "webhook")}${path.sep}`));
});
