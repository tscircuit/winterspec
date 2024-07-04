import { WinterSpecRouteFn } from "src/types/web-handler.js"

const getUser: WinterSpecRouteFn = async (request) => {
  return Response.json({
    userId: request.routeParams.userId,
  })
}

export default getUser
