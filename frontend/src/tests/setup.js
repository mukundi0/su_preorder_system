import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Node 26 has an experimental built-in localStorage that is undefined without
// --localstorage-file, which conflicts with jsdom's implementation.
// Provide a reliable in-memory storage for all tests.
function makeStorage() {
  let store = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    key: (n) => Object.keys(store)[n] ?? null,
    get length() { return Object.keys(store).length },
  }
}

vi.stubGlobal('localStorage', makeStorage())
vi.stubGlobal('sessionStorage', makeStorage())
