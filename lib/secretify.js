import makeDebug from 'debug'
import errors from '../lib/errors.js'
import secrets from '../lib/fetchSecrets.js'

const debug = makeDebug('fastify-vault-secrets:matcher')
const rx = /\{\{(.*?)\}\}/g
const left = /{{/

function parseSecret (secret) {
  return (typeof secret.version.value === 'string') ? secret.version.value : JSON.stringify(secret.version.value)
}

export async function matcher (v) {
  const matches = []
  const text = []
  const result = []
  let first = true
  v.replace(rx, (interpolator, inner, ix, str) => {
    const segments = inner.split('|').map((s) => s.trim())
    if (first && ix !== 0) result.push(str.slice(0, ix))
    const pos = ix + interpolator.length
    matches.push({ segments, interpolator })
    const nextMatch = str.slice(pos, str.length).match(left)
    const nextPos = nextMatch ? pos + nextMatch.index : str.length
    text.push(str.slice(pos, nextPos))
    first = false
    return ''
  })
  if (matches.length === 0) return v
  for (const { segments, interpolator } of matches) {
    const [key, version, format = 'content'] = segments
    if (!key || !version) throw Error(errors.secretsMisconfigured(interpolator))

    const v = (version[0] + '').toLowerCase() === 'v' ? version.slice(1) : version

    try {
      const secretMatch = await secrets('get', key, v)
      debug('Matching secret key: %s, version: %s, format: %s', key, version, format)
      result.push(parseSecret(secretMatch))
    } catch (err) {
      debug(err)
    }
  }
  return result.join('')
}
