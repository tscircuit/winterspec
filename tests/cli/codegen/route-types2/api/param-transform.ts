import { z } from "zod"
import { withWinterSpec } from "../with-winter-spec.js"

export default withWinterSpec({
  auth: "none",
  methods: ["GET", "POST"],
  jsonBody: z.object({
    // this should be written to route types as a string rather than a number
    foo_id: z.string().transform((v) => Number(v)),
  }),
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})((req) => {
  return Response.json({
    foo: {
      id: "example-id",
      name: "foo",
    },
  })
})
