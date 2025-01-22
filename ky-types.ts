export interface ApiRoutes {
  "/foo": {
    GET: {
      requestJson: { foo_id: string; },
      responseJson: { foo: { id: string; name: string; }; }
    },
    POST: {
      requestJson: { foo_id: string; },
      responseJson: { foo: { id: string; name: string; }; }
    }
        },
  "/importer": {
    PUT: {
      responseJson: { foo: { id: string; name: string; }; }
    }
        },
  "/many-params": {
    GET: {
      requestJson: { params: string; and: { params: string; many: string; this_has: string; to: string; make: string; sure: string; type_is: string; fully: string; expanded: string; }; many: string; this_has: string; to: string; make: string; sure: string; type_is: string; fully: string; expanded: string; },
      responseJson: { foo: { id: string; name: string; }; }
    },
    POST: {
      requestJson: { params: string; and: { params: string; many: string; this_has: string; to: string; make: string; sure: string; type_is: string; fully: string; expanded: string; }; many: string; this_has: string; to: string; make: string; sure: string; type_is: string; fully: string; expanded: string; },
      responseJson: { foo: { id: string; name: string; }; }
    }
        },
  "/param-transform": {
    GET: {
      requestJson: { foo_id: string; },
      responseJson: { ok: boolean; }
    },
    POST: {
      requestJson: { foo_id: string; },
      responseJson: { ok: boolean; }
    }
        },
  "/query-params": {
    GET: {
      searchParams: { foo_id: string; }
    }
        },
  "/union": {
    GET: {
      requestJson: { foo_id: string; },
      responseJson: { foo_id: string; } | boolean[]
    },
    POST: {
      requestJson: { foo_id: string; },
      responseJson: { foo_id: string; } | boolean[]
    }
        }
}