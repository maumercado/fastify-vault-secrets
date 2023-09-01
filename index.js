import { assert } from 'node:console'
import { access } from 'node:fs/promises'
import dotenv from 'dotenv'
import fp from 'fastify-plugin'
import path from 'node:path'

import { matcher } from './lib/secretify.js'

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
  const root = process.cwd()
  const name = options.filename || '.env'
  const possiblePaths = options.path ? path.resolve(path.join(root, options.path, name)) : path.resolve(path.join(root, name))
  assert(exists(possiblePaths), 'No .env file found')

  const vars = dotenv.config({
    path: possiblePaths
  })

  await resolveSecrets(vars.parsed, process)
}

export default (name = 'fastify-vault-secrets') => fp(env, {
  name
})
