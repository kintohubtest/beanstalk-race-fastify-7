'use strict'

class ContentType {
  constructor (header = '') {
    this.value = header.trim().toLowerCase()
    this.mediaType = this.value.split(/[; \t]/, 1)[0]
  }
}

module.exports = ContentType
