import * as fs from "node:fs"
const filesInCwd = async (request: Request) => {
  return Response.json({
    files_in_cwd: fs.readdirSync(process.cwd()),
  })
}

export default filesInCwd
