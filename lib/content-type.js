'use strict'

const token = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const mediaType = /^([!#$%&'*+\-.^_`|~0-9A-Za-z]+)\/([!#$%&'*+\-.^_`|~0-9A-Za-z]+)$/

class ContentType {
  constructor (value) {
    this.type = ''
    this.subtype = ''
    this.mediaType = ''
    this.parameters = new Map()
    this.isValid = false
    this.isEmpty = true

    if (typeof value !== 'string') return
    const separator = value.indexOf(';')
    const essence = (separator === -1 ? value : value.slice(0, separator)).trim()
    const match = mediaType.exec(essence)
    if (match === null) return

    this.type = match[1].toLowerCase()
    this.subtype = match[2].toLowerCase()
    this.mediaType = this.type + '/' + this.subtype
    this.isValid = true
    this.isEmpty = false

    let position = separator === -1 ? value.length : separator + 1
    while (position < value.length) {
      const start = position
      while (position < value.length && value[position] !== '=' && value[position] !== ';') position++
      const name = value.slice(start, position).trim().toLowerCase()
      if (value[position] !== '=') {
        position++
        continue
      }
      position++
      while (value[position] === ' ' || value[position] === '\t') position++
      let parameter
      if (value[position] === '"') {
        position++
        parameter = ''
        let closed = false
        while (position < value.length) {
          const character = value[position++]
          if (character === '"') {
            closed = true
            break
          }
          if (character === '\\' && position < value.length) {
            parameter += value[position++]
          } else {
            parameter += character
          }
        }
        if (!closed) parameter = 'invalid quoted string'
        while (position < value.length && value[position] !== ';') position++
      } else {
        const start = position
        while (position < value.length && value[position] !== ';') position++
        parameter = value.slice(start, position).trim()
        if (!token.test(parameter)) {
          position++
          continue
        }
      }
      if (token.test(name) && !this.parameters.has(name)) this.parameters.set(name, parameter)
      position++
    }
  }

  get isJson () {
    return this.mediaType.includes('json')
  }

  get hasCharset () {
    return this.parameters.has('charset')
  }

  toString () {
    let result = this.mediaType
    for (const [name, value] of this.parameters) {
      result += '; ' + name + '="' + value.replace(/["\\]/g, '\\$&') + '"'
    }
    return result
  }
}

module.exports = ContentType
