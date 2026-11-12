import test from "ava"
import { normalizeRouteMap } from "../../src/lib/normalize-route-map.js"

const handler = () => new Response("ok")

const literalCases: Array<{
  name: string
  route: string
  expected: Record<string, string>
}> = [
  {
    name: "plain file",
    route: "health.ts",
    expected: {
      "/health": "health.ts",
    },
  },
  {
    name: "leading slash",
    route: "/health.ts",
    expected: {
      "/health": "/health.ts",
    },
  },
  {
    name: "nested file",
    route: "api/health.ts",
    expected: {
      "/api/health": "api/health.ts",
    },
  },
  {
    name: "root index",
    route: "index.ts",
    expected: {
      "/index": "index.ts",
      "/": "index.ts",
    },
  },
  {
    name: "absolute root index",
    route: "/index.ts",
    expected: {
      "/index": "/index.ts",
      "/": "/index.ts",
    },
  },
  {
    name: "nested index",
    route: "api/index.ts",
    expected: {
      "/api/index": "api/index.ts",
      "/api/": "api/index.ts",
    },
  },
  {
    name: "absolute nested index",
    route: "/api/index.ts",
    expected: {
      "/api/index": "/api/index.ts",
      "/api/": "/api/index.ts",
    },
  },
  {
    name: "root reindex",
    route: "reindex.ts",
    expected: {
      "/reindex": "reindex.ts",
    },
  },
  {
    name: "absolute reindex",
    route: "/reindex.ts",
    expected: {
      "/reindex": "/reindex.ts",
    },
  },
  {
    name: "nested reindex",
    route: "api/reindex.ts",
    expected: {
      "/api/reindex": "api/reindex.ts",
    },
  },
  {
    name: "absolute nested reindex",
    route: "/api/reindex.ts",
    expected: {
      "/api/reindex": "/api/reindex.ts",
    },
  },
  {
    name: "hyphenated suffix",
    route: "api/my-index.ts",
    expected: {
      "/api/my-index": "api/my-index.ts",
    },
  },
  {
    name: "repeated index name",
    route: "indexindex.ts",
    expected: {
      "/indexindex": "indexindex.ts",
    },
  },
  {
    name: "dot-prefixed name",
    route: ".index.ts",
    expected: {
      "/.index": ".index.ts",
    },
  },
  {
    name: "case is unchanged",
    route: "Index.ts",
    expected: {
      "/Index": "Index.ts",
    },
  },
  {
    name: "extensionless path is unchanged",
    route: "health",
    expected: {
      "/health": "health",
    },
  },
  {
    name: "tsx behavior is unchanged",
    route: "index.tsx",
    expected: {
      "/index.tsx": "index.tsx",
    },
  },
  {
    name: "dynamic index",
    route: "users/[id]/index.ts",
    expected: {
      "/users/[id]/index": "users/[id]/index.ts",
      "/users/[id]/": "users/[id]/index.ts",
    },
  },
  {
    name: "dynamic non-index",
    route: "users/[id]/reindex.ts",
    expected: {
      "/users/[id]/reindex": "users/[id]/reindex.ts",
    },
  },
]

for (const { name, route, expected } of literalCases) {
  test(name, (t) => {
    t.deepEqual(normalizeRouteMap({ [route]: handler }), expected)
  })
}

test("suffix file cannot overwrite an explicit sibling route", (t) => {
  t.deepEqual(normalizeRouteMap({ "re.ts": handler, "reindex.ts": handler }), {
    "/re": "re.ts",
    "/reindex": "reindex.ts",
  })
})

test("sibling routes are preserved in reverse insertion order", (t) => {
  t.deepEqual(normalizeRouteMap({ "reindex.ts": handler, "re.ts": handler }), {
    "/reindex": "reindex.ts",
    "/re": "re.ts",
  })
})

test("nested suffix file cannot overwrite an explicit sibling", (t) => {
  t.deepEqual(
    normalizeRouteMap({ "/jobs/re.ts": handler, "/jobs/reindex.ts": handler }),
    {
      "/jobs/re": "/jobs/re.ts",
      "/jobs/reindex": "/jobs/reindex.ts",
    }
  )
})

test("ordinary and directory-index routes coexist without mutating input", (t) => {
  const routes = Object.freeze({
    "users.ts": handler,
    "users/index.ts": handler,
    "users/reindex.ts": handler,
  })
  const entriesBefore = Object.entries(routes)
  t.deepEqual(normalizeRouteMap(routes), {
    "/users": "users.ts",
    "/users/index": "users/index.ts",
    "/users/": "users/index.ts",
    "/users/reindex": "users/reindex.ts",
  })
  t.deepEqual(Object.entries(routes), entriesBefore)
})

test("empty route map remains empty", (t) => {
  t.deepEqual(normalizeRouteMap({}), {})
})
