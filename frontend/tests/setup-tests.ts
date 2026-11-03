import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend(matchers);

/**
 * Node >= 22.4 ships a native Web Storage getter on `globalThis`.
 * Unless the process is started with `--localstorage-file`, that getter
 * returns `undefined`, and Vitest's jsdom environment only copies jsdom's
 * window keys onto the test global when the key is still free.
 * Because Node has already defined `localStorage`, jsdom's working Storage
 * is never installed — every test sees `undefined`.
 *
 * Install a minimal, correct `Storage` whenever the existing global is not
 * usable. This is idempotent: if jsdom's real Storage is present (older
 * Node, or a future Vitest that fixes the shadowing), the guard returns
 * early and nothing changes.
 */
function installStorageStub(name: 'localStorage' | 'sessionStorage') {
  const existing = (globalThis as Record<string, unknown>)[name] as
    | Partial<Storage>
    | undefined;

  // A usable Storage exposes at least getItem/setItem/removeItem as functions.
  if (existing && typeof existing.getItem === 'function') return;

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

  // `defineProperty` (not assignment) reliably replaces Node's native getter.
  // `configurable: true` lets later tooling (or another setup file) rebind it.
  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    writable: true
  });
}

installStorageStub('localStorage');
installStorageStub('sessionStorage');

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
  // Storage is process-global and survives across tests in a file.
  // Clear it so tests do not leak state into each other.
  localStorage.clear();
  sessionStorage.clear();
});
