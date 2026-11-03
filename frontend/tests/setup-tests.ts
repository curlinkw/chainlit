import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend(matchers);

/**
 * Node 25+ defines its own localStorage / sessionStorage getters on
 * globalThis that return undefined unless --localstorage-file is passed.
 *
 * Vitest's jsdom environment only copies window keys that are not already
 * present on the test global. Because Node already defines these names,
 * jsdom's working Storage is shadowed and every storage-touching test fails
 * with "Cannot read properties of undefined".
 *
 * Fix: re-expose jsdom's real Storage objects on globalThis whenever the
 * current global is unusable. On Node <= 24 this is a no-op.
 *
 * This is the pattern used in upstream fixes for the same breakage:
 * - https://github.com/AlexsJones/llmfit/pull/1222
 * - https://github.com/omnigent-ai/omnigent/pull/8299
 */
function restoreJsdomStorage(name: 'localStorage' | 'sessionStorage') {
  const current = (globalThis as Record<string, unknown>)[name] as
    | Partial<Storage>
    | undefined;

  // If a usable Storage is already present, do nothing.
  if (current && typeof current.getItem === 'function') return;

  // Prefer jsdom's real Storage so that StorageEvent, prototype spies and
  // other jsdom features keep working.
  const jsdomWindow = (globalThis as { jsdom?: { window?: Window } }).jsdom
    ?.window;

  if (jsdomWindow && jsdomWindow[name]) {
    Object.defineProperty(globalThis, name, {
      value: jsdomWindow[name],
      configurable: true,
      writable: true
    });
    return;
  }

  // Fallback: minimal in-memory Storage. This is only reached in a pure Node
  // environment where jsdom is not loaded at all.
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    }
  };

  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    writable: true
  });
}

restoreJsdomStorage('localStorage');
restoreJsdomStorage('sessionStorage');

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();

// Polyfill DOMMatrix for pdfjs-dist which requires it at import time in JSDOM
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: any) {}
    static fromMatrix(_other?: any): DOMMatrix {
      return new DOMMatrix();
    }
    static fromFloat32Array(_array32: any): DOMMatrix {
      return new DOMMatrix();
    }
    static fromFloat64Array(_array64: any): DOMMatrix {
      return new DOMMatrix();
    }
  } as unknown as typeof DOMMatrix;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
