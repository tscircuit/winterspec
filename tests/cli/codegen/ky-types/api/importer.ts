import { withWinterSpec } from "../with-winter-spec.js"
import { jsonResponse } from "./foo.js"

export default withWinterSpec({
  auth: "none",
  methods: ["PUT"],
  jsonResponse,
})((req) => {
  return Response.json({
    foo: {
      id: "example-id",
      name: "foo",
    },
  })
})
