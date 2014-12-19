// Copyright 2014 Urban Airship and Contributors

var Stream = require('stream')

var deepequal = require('deep-equal')
  , prop = require('deep-property')

module.exports = ObjectState

function ObjectState(_initial) {
  Stream.call(this)

  this.writable = true
  this.readable = true

  this._state = deepcopy(_initial || {})
}

ObjectState.prototype = Object.create(Stream.prototype)

ObjectState.prototype.wait = function wait(fn) {
  var original = deepcopy(this._state)
    , shouldEmit = false
    , emit = this.emit

  // shadow the prototype property
  this.emit = function() {
    shouldEmit = true
  }

  try {
    fn()
  } finally {
    this.emit = emit

    if(shouldEmit && !equal(this._state, original)) {
      this.emitState()
    }
  }
}

ObjectState.prototype.listen = function listen(src, key) {
  src.on('data', this.set.bind(this, key))
}

ObjectState.prototype.listenOn = function listenOn(ee, name, params) {
  var paramsLength = params.length
    , self = this

  ee.on(name, receiveEvent)

  return self

  function receiveEvent() {
    var args = [].slice.call(arguments)

    self.wait(applyContext)

    function applyContext() {
      var param
        , arg

      for(var i = 0; i < paramsLength; ++i) {
        param = params[i]
        arg = args[i]

        if(!param) {
          continue
        }

        if(typeof arg === 'undefined') {
          self.remove(param)

          continue
        }

        self.set(param, arg)
      }
    }
  }
}

ObjectState.prototype.emitState = function emitState() {
  this.emit('data', deepcopy(this._state))
}

ObjectState.prototype.get = function get(key) {
  return prop.get(this._state, key)
}

ObjectState.prototype.set = function set(key, val) {
  var shouldEmit = !equal(this.get(key), val)

  if(!shouldEmit) {
    return
  }

  prop.set(this._state, key, deepcopy(val))

  this.emitState()
}

ObjectState.prototype.remove = function remove(key) {
  if(!this._state.hasOwnProperty(key)) {
    return false
  }

  delete this._state[key]

  this.emitState()
}

ObjectState.prototype.write = function write(data) {
  var shouldEmit = !equal(this._state, data)

  if(!shouldEmit) {
    return
  }

  this._state = deepcopy(data)

  this.emitState()
}

function deepcopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function equal(x, y) {
  return deepequal(x, y, {strict: true})
}
