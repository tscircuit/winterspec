const echo = async (request: Request) => {
  const url = new URL(request.url)
  return new Response("", {
    status: Number(url.searchParams.get("status") ?? 400),
    headers: request.headers,
  })
}

export default echo
