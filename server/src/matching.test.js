import { describe, expect, it } from 'vitest'
import { keywordsFrom } from './matching.js'

describe('request keyword extraction', () => {
  it('normalizes useful words and removes common filler', () => {
    expect(keywordsFrom('I need a chocolate birthday cake delivered around Alagbaka')).toEqual(
      expect.arrayContaining(['chocolate', 'birthday', 'cake', 'alagbaka']),
    )
    expect(keywordsFrom('I need a cake')).not.toContain('need')
  })

  it('does not return duplicate keywords', () => {
    expect(keywordsFrom('phone phone screen repair')).toEqual(['phone', 'screen', 'repair'])
  })
})
