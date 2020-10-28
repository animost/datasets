const childProcess = require("child_process")
const core = require("@actions/core")
const fs = require("fs")
const https = require("https")
const path = require("path")
const stream = require("stream")
const url = require("url")
const util = require("util")
const zlib = require("zlib")

const downloadAnimeTitles = outFile => new Promise((resolve, reject) => {
  const options = url.parse("https://anidb.net/api/anime-titles.dat.gz")
  options.headers = { "user-agent": "animost" }

  const gunzip = zlib.createGunzip()
  const file = fs.createWriteStream(outFile)
  const callback = res => {
    stream.pipeline(res, gunzip, file, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  }

  https.get(options, callback)
})

const main = async () => {
  try {
    const { GITHUB_WORKSPACE = path.join(__dirname, "..") } = process.env
    const OUT_FILE = path.join(GITHUB_WORKSPACE, "anidb", "anime-titles.dat")

    await downloadAnimeTitles(OUT_FILE)

    const exec = util.promisify(childProcess.exec)
    const options = {
      cwd: GITHUB_WORKSPACE,
      listeners: {
        stdline: core.debug,
        debug: core.debug
      }
    }

    await exec(`git config user.name "GitHub"`, options)
    await exec(`git config user.email "noreply@github.com"`, options)

    await exec(`git add ${OUT_FILE}`, options)

    try {
      await exec(`git commit -m "⬆️ anidb"`, options)
    } catch (error) {
      core.debug("nothing to commit")
      return
    }

    await exec("git push --set-upstream origin HEAD:master", options)
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
