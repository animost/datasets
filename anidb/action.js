const core = require('@actions/core')
const got = require('got')
const zlib = require('zlib')
const fs = require('fs')
const stream = require('stream')
const path = require('path')
const childProcess = require('child_process')
const util = require('util');

const pipeline = util.promisify(stream.pipeline)
const exec = util.promisify(childProcess.exec)

async function main() {
  try {
    const { GITHUB_WORKSPACE = path.join(__dirname, '..') } = process.env
    const OUT_FILE = `${GITHUB_WORKSPACE}/anidb/anime-titles.dat`

    await pipeline(
      got.stream('http://anidb.net/api/anime-titles.dat.gz'),
      zlib.createGunzip(),
      fs.createWriteStream(OUT_FILE)
    )

    const options = {
      cwd: GITHUB_WORKSPACE,
      listeners: {
        stdline: core.debug,
        debug: core.debug
      }
    }

    await exec('git config user.name "GitHub"', options)
    await exec('git config user.email "noreply@github.com"', options)

    await exec(`git add ${OUT_FILE}`, options)

    try {
      await exec('git commit -m "⬆️ anidb"', options)
    } catch (error) {
      core.debug('nothing to commit, working tree clean');
      return;
    }

    await exec('git push --set-upstream origin HEAD:master', options)
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
