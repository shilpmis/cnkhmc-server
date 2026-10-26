import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = new Secret(env.get('APP_KEY'))

/**
 * The app runs behind nginx and an AWS load balancer, so the socket address is always the proxy.
 * Trust forwarded headers only from loopback and private networks (nginx on this host and the
 * load balancer inside the VPC), so request.ip() is the real client address. Rate limits and the
 * PII access log depend on this.
 */
const isTrustedProxy = (address: string): boolean => {
  const ip = address.replace(/^::ffff:/, '')
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    /^10./.test(ip) ||
    /^192.168./.test(ip) ||
    /^172.(1[6-9]|2d|3[01])./.test(ip)
  )
}

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  generateRequestId: true,
  trustProxy: (address: string) => isTrustedProxy(address),
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
