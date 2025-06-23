import { z } from "zod"
import { withWinterSpec } from "../with-winter-spec.js"

export default withWinterSpec({
  auth: "none",
  methods: ["GET", "POST"],
  jsonBody: z.object({
    foo_id: z.string().uuid(),
  }),
  jsonResponse: z.union([
    z.object({
      foo_id: z.string(),
    }),
    z.boolean().array(),
  ]),
})((req) => {
  return Response.json({
    foo: {
      id: "example-id",
      name: "foo",
    },
  })
})
