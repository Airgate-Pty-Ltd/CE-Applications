import { describe, expect, it } from 'vitest'
import { canonicalJson, contentHash, sha256Hex } from '../../src/engine/hash.ts'

describe('sha256', () => {
  // Published vectors. If the implementation drifts, every evidence hash ever
  // written by this product becomes unverifiable, so these are pinned first.
  it('matches the empty-string vector', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('matches the "abc" vector', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('matches the 448-bit vector that forces a second block', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    )
  })

  it('handles multi-byte characters by hashing their utf-8 bytes', () => {
    expect(sha256Hex('°')).toHaveLength(64)
    expect(sha256Hex('°')).not.toBe(sha256Hex('?'))
  })
})

describe('canonical json', () => {
  it('sorts object keys so field order cannot change a hash', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }))
  })

  it('preserves array order, which is meaningful', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]))
  })

  it('treats an absent field and an undefined field alike', () => {
    expect(contentHash({ a: 1 })).toBe(contentHash({ a: 1, b: undefined }))
  })

  it('refuses values it cannot canonicalise rather than hashing something else', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow(TypeError)
    expect(() => canonicalJson(() => undefined)).toThrow(TypeError)
  })

  it('canonicalises nested structures', () => {
    expect(canonicalJson({ z: [{ b: 1, a: 2 }], a: null })).toBe('{"a":null,"z":[{"a":2,"b":1}]}')
  })
})
