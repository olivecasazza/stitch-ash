import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { buildAdminClient } from './shopify-admin.js'

/**
 * The static Admin token had two names, and only one of them was ever read.
 *
 * Every other consumer in this repo — `scripts/shopify-env.ts`, the CI gates,
 * `docs/shopify-bot-bootstrap.md`, and the nixlab tofu fixture that declares
 * `variable "SHOPIFY_ADMIN_TOKEN"` — spells the static token
 * `SHOPIFY_ADMIN_ACCESS_TOKEN`. Only `buildAdminClient` read
 * `SHOPIFY_ADMIN_TOKEN`.
 *
 * So an operator who followed the documentation to the letter, set
 * `SHOPIFY_ADMIN_ACCESS_TOKEN`, and had no client-credentials pair was told the
 * variable was "missing/invalid" — while the variable they had just set was
 * never even looked at, and the error text named a different variable than the
 * one they had populated. Nothing in the catalog test suite covered the
 * variable name, so the divergence stayed invisible.
 *
 * The properties pinned here:
 *   1. The documented name `SHOPIFY_ADMIN_ACCESS_TOKEN` is authoritative and
 *      must be honoured.
 *   2. `SHOPIFY_ADMIN_TOKEN` stays accepted as a legacy alias, so the nixlab
 *      tofu variable and existing operator environments keep working.
 *   3. When both are set they agree in practice, so precedence is only a
 *      tie-break, never a behaviour anyone can observe.
 *   4. A `SHOPIFY_ADMIN_ACCESS_TOKEN` that is set but unusable must fail with a
 *      message naming the variable the operator actually set. An error that
 *      names the wrong variable is what made this cost a whole debugging run.
 */
describe('the static Admin token is read under the documented name', () => {
    const KEYS = [
        'SHOPIFY_ADMIN_ACCESS_TOKEN',
        'SHOPIFY_ADMIN_TOKEN',
        'SHOPIFY_CLIENT_ID',
        'SHOPIFY_CLIENT_SECRET',
    ] as const

    const saved = new Map<string, string | undefined>()

    afterEach(() => {
        for (const key of KEYS) {
            const original = saved.get(key)
            if (original === undefined) Reflect.deleteProperty(process.env, key)
            else process.env[key] = original
        }
    })

    function useEnv(values: Partial<Record<(typeof KEYS)[number], string>>): void {
        for (const key of KEYS) {
            if (!saved.has(key)) saved.set(key, process.env[key])
            Reflect.deleteProperty(process.env, key)
        }
        for (const [key, value] of Object.entries(values)) process.env[key] = value
    }

    it('honours SHOPIFY_ADMIN_ACCESS_TOKEN, the name the docs and CI gates use', async () => {
        useEnv({ SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_documented_name' })

        const client = await buildAdminClient()

        assert.equal(client.source, 'static')
        assert.equal(client.token, 'shpat_documented_name')
    })

    it('still accepts the legacy SHOPIFY_ADMIN_TOKEN so nixlab keeps working', async () => {
        useEnv({ SHOPIFY_ADMIN_TOKEN: 'shpat_legacy_name' })

        const client = await buildAdminClient()

        assert.equal(client.source, 'static')
        assert.equal(client.token, 'shpat_legacy_name')
    })

    it('does not report the legacy name as missing when only the documented name is set', async () => {
        useEnv({ SHOPIFY_ADMIN_ACCESS_TOKEN: 'shpat_documented_name' })

        // The pre-fix behaviour threw here, naming a variable the operator never set.
        await assert.doesNotReject(() => buildAdminClient())
    })

    it('names SHOPIFY_ADMIN_ACCESS_TOKEN in the failure message when the token is unusable', async () => {
        useEnv({ SHOPIFY_ADMIN_ACCESS_TOKEN: 'atkn_shopify_cli_automation_token' })

        await assert.rejects(
            () => buildAdminClient(),
            (error: unknown) => {
                const message = (error as Error).message
                assert.match(message, /SHOPIFY_ADMIN_ACCESS_TOKEN/)
                // The legacy alias is still worth reporting, because it is still read.
                assert.match(message, /SHOPIFY_ADMIN_TOKEN/)
                return true
            },
        )
    })

    it('never reports an automation token as the reason for success', async () => {
    // `atkn_` is a Shopify CLI automation token, not an Admin API token. Reading
    // one as a static Admin token produces a client that looks configured and
    // then fails every live call, which is the shape of defect this guards.
        useEnv({ SHOPIFY_ADMIN_ACCESS_TOKEN: 'atkn_shopify_cli_automation_token' })

        await assert.rejects(() => buildAdminClient(), /client_credentials|missing\/invalid|atkn_/)
    })
})
