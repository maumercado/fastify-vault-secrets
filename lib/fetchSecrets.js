'use strict'
import makeDebug from 'debug'
import got from 'got'
import assert from 'node:assert'

const debug = makeDebug('fastify-vault-secrets:fetchSecrets')
const errorLog = debug.extend('error')
assert(process.env.HCP_ORG_ID, 'HCP_ORG_ID is required')
assert(process.env.HCP_PROJ_ID, 'HCP_PROJ_ID is required')
assert(process.env.APP_NAME, 'APP_NAME is required')

const HCP_ORG_ID = process.env.HCP_ORG_ID
const HCP_PROJ_ID = process.env.HCP_PROJ_ID
const APP_NAME = process.env.APP_NAME

const VAULT_AUTH = process.env.VAULT_AUTH || 'https://auth.hashicorp.com/oauth/token'
const VAULT = process.env.VAULT || 'https://api.hashicorp.cloud'
const VAULT_VERSION = process.env.VAULT_VERSION || '2023-06-13'
const VAULT_KV_PATH = `secrets/${VAULT_VERSION}/organizations/${HCP_ORG_ID}/projects/${HCP_PROJ_ID}/apps/${APP_NAME}/open`

async function fetchVaultToken () {
  assert(process.env.HCP_CLIENT_ID, 'HCP_CLIENT_ID is required')
  assert(process.env.HCP_CLIENT_SECRET, 'HCP_CLIENT_SECRET is required')
  try {
    debug('Fetching token')
    const result = await got.post(`${VAULT_AUTH}`, {
      json: {
        audience: VAULT,
        grant_type: 'client_credentials',
        client_id: process.env.HCP_CLIENT_ID,
        client_secret: process.env.HCP_CLIENT_SECRET
      }
    }).json()
    if (!result.access_token) {
      const err = Error('Unauthenticated')
      err.code = 'E_UNAUTH'
      throw err
    }
    return result.access_token
  } catch (err) {
    if (err.code === 'E_UNAUTH') {
      errorLog('Unable to authenticate', err)
    } else {
      errorLog('Unknown problem fetching secrets, config may be corrupted or secrets service may be down')
    }
    process.exitCode = 1
  }
}

async function secrets (cmd, key, version) {
  const token = await fetchVaultToken()

  async function getAll () {
    try {
      debug('Fetching secrets')
      return got(`${VAULT}/${VAULT_KV_PATH}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).json()

      /**
       * {
          "secrets": [
            {
              "name": "test",
              "version": {
                "version": "1",
                "type": "kv",
                "created_at": "2023-08-24T01:30:36.105455Z",
                "value": "wow",
                "created_by": {
                  "name": "maumercado@gmail.com",
                  "type": "TYPE_USER",
                  "email": "maumercado@gmail.com"
                }
              },
              "created_at": "2023-08-24T01:30:36.105455Z",
              "latest_version": "1",
              "created_by": {
                "name": "maumercado@gmail.com",
                "type": "TYPE_USER",
                "email": "maumercado@gmail.com"
              },
              "sync_status": {}
            }
          ]
        }
       */
    } catch (err) {
      if (err.response && err.response.statusCode === 403) {
        errorLog('\n', 'Unable to authenticate with Vault, please try again or check permissions', '\n')
        process.exitCode = 1
        return
      }

      if (err.response && err.response.statusCode === 404) {
        errorLog(err.message)
        process.exitCode = 1
        return
      }
      throw err
    }
  }

  async function get (key, version) {
    try {
      debug('Fetching secrets')
      return got(`${VAULT}/${VAULT_KV_PATH}/${key}/versions/${version}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).json()

      /**
       * {
          "secrets": [
            {
              "name": "test",
              "version": {
                "version": "1",
                "type": "kv",
                "created_at": "2023-08-24T01:30:36.105455Z",
                "value": "wow",
                "created_by": {
                  "name": "maumercado@gmail.com",
                  "type": "TYPE_USER",
                  "email": "maumercado@gmail.com"
                }
              },
              "created_at": "2023-08-24T01:30:36.105455Z",
              "latest_version": "1",
              "created_by": {
                "name": "maumercado@gmail.com",
                "type": "TYPE_USER",
                "email": "maumercado@gmail.com"
              },
              "sync_status": {}
            }
          ]
        }
       */
    } catch (err) {
      if (err.response && err.response.statusCode === 403) {
        errorLog('\n', 'Unable to authenticate with Vault, please try again or check permissions', '\n')
        process.exitCode = 1
        return
      }

      if (err.response && err.response.statusCode === 404) {
        errorLog(err.message)
        process.exitCode = 1
        return
      }
      throw err
    }
  }

  if (token && cmd) {
    switch (cmd) {
      case 'get':
        return get(key, version)
      case 'ls':
        return getAll()
    }
  }
}

export default secrets
