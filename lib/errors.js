const errors = {
  secretsMisconfigured: (interpolator) => `Secrets are misconfigured, both path and field segments are required. See ${interpolator}`,
  secretNotFound: (key, version) => `Secret not found for key: ${key} and version: ${version}`,
  unknownFormat: (format) => `Unknown format: ${format}`
}

export default errors
