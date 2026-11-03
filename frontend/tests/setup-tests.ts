import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend(matchers);

/**
 * Node >= 23 ships a global localStorage/sessionStorage getter that returns
 * undefined unless the process was started with --localstorage-file.
 *
 * Vitest's jsdom environment only copies jsdom window keys that are still
 * free on the test global. Because Node already defines localStorage,
 * jsdom's working Storage is shadowed and every test sees undefined.
 *
 * Rebind jsdom's real Storage whenever the test global disagrees with the
 * jsdom window. This is a no-op on Node <= 24, where the global is not
 * shadowed and both already point at the same object.
 *
 * This is the same pattern used in upstream fixes for this issue.
 */
const jsdomHost: { jsdom?: { window?: Record<string, unknown> } } = globalThis;
const jsdomWindow = jsdomHost.jsdom?.window;

if (jsdomWindow) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    const testGlobal: Record<string, unknown> = globalThis;
    if (testGlobal[key] !== jsdomWindow[key]) {
      Object.defineProperty(globalThis, key, {
        get: () => jsdomWindow[key],
        configurable: true
      });
    }
  }
}

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
  // Storage is process-global; clear it to prevent cross-test leakage.
  localStorage.clear();
  sessionStorage.clear();
});
