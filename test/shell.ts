import { exec } from 'child_process'

import { delay } from '../src/utils/index'

const LOGGING = !!process.env.LOGSHELL

function sh(cmd: string) {
  return new Promise<void>((resolve, reject) => {
    const cp = exec(cmd, (err, stdout, stderr) => {
      if (stdout && LOGGING) {
        console.log(`[${cp.pid}] stdout:`)
        console.log(stdout)
      }
      if (stderr && LOGGING) {
        console.log(`[${cp.pid}] stderr:`)
        console.log(stderr)
      }
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
    console.log(`[${cp.pid}] ${cmd}`)
  })
}

export async function upRedisServer(num: number) {
  const port = 6000 + num
  await sh(
    `docker-compose up -d redis${num} && yarn wait-for --redis redis://127.0.0.1:${port}`
  )
}

export async function downRedisServer(num: number) {
  const port = 6000 + num
  await sh(`docker-compose stop redis${num}`)
  let tries = 0
  while (true) {
    try {
      console.log(`wait server${num} shut down... ${++tries}`)
      await sh(`yarn wait-for --redis redis://127.0.0.1:${port} -c 1`)
      await delay(100)
    } catch {
      break
    }
  }
}
