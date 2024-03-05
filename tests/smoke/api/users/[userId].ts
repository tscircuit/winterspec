import { EdgeSpecRouteFn } from "src/types/web-handler.js"

const getUser: EdgeSpecRouteFn = async (request) => {
  return Response.json({
    userId: request.routeParams.userId,
  })
}

export default getUser
