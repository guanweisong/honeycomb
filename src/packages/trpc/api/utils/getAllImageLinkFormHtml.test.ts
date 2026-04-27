import { describe, it, expect } from 'vitest'
import { getAllImageLinkFormHtml } from './getAllImageLinkFormHtml'

describe('getAllImageLinkFormHtml', () => {
  it('should return empty array for undefined html', () => {
    const result = getAllImageLinkFormHtml(undefined)
    expect(result).toEqual([])
  })

  it('should return empty array for falsy html', () => {
    const result = getAllImageLinkFormHtml(undefined)
    expect(result).toEqual([])
  })

  it('should return empty array for empty string', () => {
    const result = getAllImageLinkFormHtml('')
    expect(result).toEqual([])
  })

  it('should extract single image link', () => {
    const html = '<img src="https://example.com/image.jpg" />'
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual(['https://example.com/image.jpg'])
  })

  it('should extract multiple image links', () => {
    const html = `
      <img src="https://example.com/image1.jpg" />
      <img src="https://example.com/image2.jpg" />
      <img src="https://example.com/image3.jpg" />
    `
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual([
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ])
  })

  it('should handle images with additional attributes', () => {
    const html = '<img src="https://example.com/image.jpg" alt="test" width="100" />'
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual(['https://example.com/image.jpg'])
  })

  it('should handle images without src attribute', () => {
    const html = '<img alt="test" width="100" />'
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual([])
  })

  it('should handle mixed content with images', () => {
    const html = `
      <div>
        <p>Some text</p>
        <img src="https://example.com/image1.jpg" />
        <p>More text</p>
        <img src="https://example.com/image2.jpg" />
      </div>
    `
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual([
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ])
  })

  it('should handle relative URLs', () => {
    const html = '<img src="/images/image.jpg" />'
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual(['/images/image.jpg'])
  })

  it('should handle data URLs', () => {
    const html = '<img src="data:image/png;base64,iVBORw0KG..." />'
    const result = getAllImageLinkFormHtml(html)
    expect(result).toEqual(['data:image/png;base64,iVBORw0KG...'])
  })
})
