import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../app/index.html', import.meta.url), 'utf8')
const start = html.indexOf('function preserveUnreadableLocalCopy()')
const end = html.indexOf('async function resumeStoredApp()', start)
const source = html.slice(start, end)

function fixture({ failPreserve = false } = {}) {
  const current = JSON.stringify({ modernoPendingArchive: 1, key: 'live-copy' })
  const values = new Map([['moderno_prod_v1', current]])
  let started = 0
  const view = { replaceChildren() {}, append() {} }
  const context = {
    LS_KEY: 'moderno_prod_v1',
    _localResumePointer: current,
    _localResumePending: true,
    _localResumeFailed: true,
    _localResumeBypassed: false,
    _resumeRaw: 'unreadable',
    sb: {},
    crypto: { randomUUID: () => 'fixture-id' },
    Math,
    Date: { now: () => 2100000000000 },
    ModernoPendingArchive: {
      pointer(raw) {
        try {
          const value = JSON.parse(raw)
          return value?.modernoPendingArchive === 1 ? value.key : null
        } catch {
          return null
        }
      },
    },
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem(key, value) {
        if (failPreserve && key.includes('_pendiente_recuperacion_')) throw new Error('full')
        values.set(key, value)
      },
      removeItem: key => values.delete(key),
    },
    document: {
      getElementById: () => view,
      createElement: () => ({ style: {}, append() {}, set className(value) {}, set textContent(value) {}, set onclick(value) {} }),
    },
    showLogin() {},
    resumeStoredApp() {},
    startRestoredApp() { started += 1 },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  return { context, values, current, started: () => started }
}

test('cloud fallback preserves the unreadable pointer before starting the app', () => {
  const fixtureState = fixture()
  fixtureState.context.continueWithCloudCopy()
  const recovery = [...fixtureState.values.entries()].find(([key]) => key.includes('_pendiente_recuperacion_'))
  assert.ok(recovery)
  assert.equal(recovery[1], fixtureState.current)
  assert.equal(fixtureState.values.get('moderno_prod_v1'), fixtureState.current)
  assert.equal(fixtureState.context._localResumePending, false)
  assert.equal(fixtureState.context._localResumeBypassed, true)
  assert.equal(fixtureState.context._resumeRaw, null)
  assert.equal(fixtureState.started(), 1)
})

test('cloud fallback refuses to start if the local pointer cannot be preserved', () => {
  const fixtureState = fixture({ failPreserve: true })
  fixtureState.context.continueWithCloudCopy()
  assert.equal(fixtureState.context._localResumePending, true)
  assert.equal(fixtureState.context._localResumeBypassed, false)
  assert.equal(fixtureState.started(), 0)
})

test('startup recovery is bounded and local writes remain blocked until cloud confirmation', () => {
  assert.match(html, /for\(let attempt=0;attempt<3;attempt\+\+\)/)
  assert.match(html, /LocalCopyReadTimeoutError/)
  assert.match(html, /_pendingArchiveStore\?\.reset\?\.\(\)/)
  assert.match(html, /if\(_localResumePending\|\|_localResumeBypassed&&\(!_cloudLoadedStudy\|\|_accessLoading\)\)return/)
  assert.match(html, /if\(_localResumeBypassed\)\{_localResumeBypassed=false;_localResumeFailed=false;\}/)
})
