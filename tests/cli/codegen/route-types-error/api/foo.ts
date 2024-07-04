import { z } from "zod"
import { withWinterSpec } from "../with-winter-spec.js"

export const jsonResponse = z.object({
  foo: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
})

export default withWinterSpec({
  auth: "none",
  methods: ["GET", "POST"],
  jsonBody: z.object({
    foo_id: z.string().uuid().thisMethodDoesNotExist(),
  }),
  jsonResponse,
})((req) => {
  return Response.json({
    foo: {
      id: "example-id",
      name: "foo",
    },
  })
})
