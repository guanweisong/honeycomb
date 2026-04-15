import { describe, it, expect } from 'vitest'
import { queryString } from './query.string.schema'

describe('query string schema', () => {
  it('should transform empty string to undefined', () => {
    const schema = queryString()
    const result = schema.parse('')
    expect(result).toBeUndefined()
  })

  it('should keep non-empty string as is', () => {
    const schema = queryString()
    const result = schema.parse('test')
    expect(result).toBe('test')
  })

  it('should trim whitespace before transform', () => {
    const schema = queryString()
    const result = schema.parse('  test  ')
    expect(result).toBe('test')
  })

  it('should transform whitespace-only string to undefined', () => {
    const schema = queryString()
    const result = schema.parse('   ')
    expect(result).toBeUndefined()
  })

  it('should return undefined for optional field', () => {
    const schema = queryString()
    const result = schema.parse(undefined)
    expect(result).toBeUndefined()
  })
})
