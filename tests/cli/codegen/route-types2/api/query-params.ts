import { z } from "zod"
import { withWinterSpec } from "../with-winter-spec.js"

export default withWinterSpec({
  auth: "none",
  methods: ["GET"],
  queryParams: z.object({
    foo_id: z.string().uuid(),
  }),
})((req) => {
  return Response.json({})
})
