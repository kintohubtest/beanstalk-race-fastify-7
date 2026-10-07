'use strict'

class ContentType {
  constructor (header = '') {
    this.header = header
    this.normalized = header.trim().toLowerCase()
    this.mediaType = this.normalized.split(/[;\s]/, 1)[0]
  }

  get isJson () {
    return this.mediaType.includes('json')
  }

  get hasCharset () {
    return /;\s*charset\s*=/i.test(this.header)
  }
}

module.exports = ContentType
