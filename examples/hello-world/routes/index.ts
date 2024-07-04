import { withWinterSpec } from "../src/with-winter-spec"

export default withWinterSpec({
  auth: "none",
  methods: ["GET"],
})((req) => {
  return new Response("Hello world!")
})
