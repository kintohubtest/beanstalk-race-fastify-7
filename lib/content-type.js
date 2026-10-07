'use strict'

const token = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const quotedValue = /^[\t\x20-\x7e\x80-\xff]*$/

class ContentType {
  constructor (value) {
    this.type = ''
    this.subtype = ''
    this.parameters = new Map()

    if (typeof value !== 'string') return
    value = value.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, '')
    const separator = value.indexOf(';')
    const essence = (separator === -1 ? value : value.slice(0, separator)).replace(/[\t ]+$/, '')
    const slash = essence.indexOf('/')
    if (slash === -1) return
    const type = essence.slice(0, slash)
    const subtype = essence.slice(slash + 1)
    if (!token.test(type) || !token.test(subtype)) return

    this.type = type.toLowerCase()
    this.subtype = subtype.toLowerCase()
    let position = separator === -1 ? value.length : separator
    while (position < value.length) {
      position++
      while (value[position] === ' ' || value[position] === '\t') position++
      const start = position
      while (position < value.length && value[position] !== ';' && value[position] !== '=') position++
      const name = value.slice(start, position).toLowerCase()
      if (value[position] !== '=') continue
      position++
      let parameter = ''
      if (value[position] === '"') {
        position++
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
        parameter = value.slice(start, position).replace(/[\t ]+$/, '')
        if (!token.test(parameter)) continue
      }
      if (token.test(name) && quotedValue.test(parameter) && !this.parameters.has(name)) {
        this.parameters.set(name, parameter)
      }
    }
  }

  get isEmpty () {
    return this.type === ''
  }

  get isValid () {
    return !this.isEmpty
  }

  get mediaType () {
    return this.isEmpty ? '' : `${this.type}/${this.subtype}`
  }

  toString () {
    let value = this.mediaType
    for (const [name, parameter] of this.parameters) {
      value += `; ${name}="${parameter.replace(/["\\]/g, '\\$&')}"`
    }
    return value
  }
}

module.exports = ContentType
