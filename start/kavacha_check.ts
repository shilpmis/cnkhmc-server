import KavachaCipher from '#services/kavacha_cipher'
import env from '#start/env'

/**
 * Boot-time check: prints whether the encryption keyring is usable, so a misconfigured
 * server is obvious in its log instead of showing up later as 500 errors on student/staff pages.
 * It prints variable NAMES and value lengths only, never key material.
 */
try {
  KavachaCipher.sealField('boot-check', 'boot.check')
  console.log(
    `[Kavacha] keyring OK (active version ${env.get('KAVACHA_ACTIVE_VERSION') ?? 'latest'}). Encrypted fields and files are readable.`
  )
} catch (error: any) {
  // Show what this process can actually see, to expose typos and variables set in the wrong place.
  const seen = Object.keys(process.env)
    .filter((name) => /kavacha|keyring/i.test(name))
    .map((name) => `${name} (${String(process.env[name] ?? '').length} chars)`)

  console.error(
    `[Kavacha] KEYRING PROBLEM: ${error.message}\n` +
      '          Student/staff pages that load Aadhaar, PAN or account numbers will return 500 until this is fixed.\n' +
      `          Variables this process can see with a matching name: ${seen.length ? seen.join(', ') : 'NONE'}\n` +
      '          Expected: KAVACHA_KEYRING (and KAVACHA_ACTIVE_VERSION) set in the Elastic Beanstalk environment properties.'
  )
}
