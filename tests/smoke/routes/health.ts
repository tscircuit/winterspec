const health = async (request: Request) => {
  return Response.json({
    method: request.method,
    body: await request.json(),
    headers: Object.fromEntries(request.headers.entries()),
  })
}

export default health
