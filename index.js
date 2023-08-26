import { assert } from 'node:console'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import fp from 'fastify-plugin'
import path from 'node:path'

import { matcher } from './lib/secretify'

const exists = async (file) => {
  try {
    await access(file)
    return true
  } catch (e) {
    return false
  }
}

async function resolveSecrets (vars, writeIntoEnv) {
  for (const [k, v] of Object.entries(vars)) {
    writeIntoEnv.env[k] = await matcher(v)
  }
}

async function env (_, options) {
  const __filename = fileURLToPath(import.meta.url)
  const root = path.dirname(__filename)

  const possiblePaths = options.path ? path.resolve(path.join(options.path, '.env')) : path.resolve(path.join(root, '../', '.env'))
  console.log(possiblePaths)
  assert(exists(possiblePaths), 'No .env file found')

  const vars = dotenv.config({
    path: possiblePaths
  })

  await resolveSecrets(vars, process)
}

export default fp(env, {
  name: 'env-secrets'
})
