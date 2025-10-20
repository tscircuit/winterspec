import { z } from "zod"
import { withWinterSpec } from "../with-winter-spec.js"

const manyParams = z.object({
  this_has: z.string(),
  many: z.string(),
  params: z.string(),
  to: z.string(),
  make: z.string(),
  sure: z.string(),
  type_is: z.string(),
  fully: z.string(),
  expanded: z.string(),
})

export default withWinterSpec({
  auth: "none",
  methods: ["GET", "POST"],
  jsonBody: manyParams.extend({
    and: manyParams,
  }),
  jsonResponse: z.object({
    foo: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  }),
})((req) => {
  return Response.json({
    foo: {
      id: "example-id",
      name: "foo",
    },
  })
})
