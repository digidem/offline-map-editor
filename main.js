var randombytes = require('randombytes')
var xtend = require('xtend')
var concat = require('concat-stream')
var wsock = require('websocket-stream')
var through = require('through2')

var level = require('level-browserify')
var hyperlog = require('hyperlog')
var hyperkv = require('hyperkv')

var db = level('map')
var log = hyperlog(db, { valueEncoding: 'json' })

var kv = hyperkv({ db: db, log: log })

kv.on('update', function (key, value, node) {
  kv.get(key, function (err, values) {
    if (err) console.error(err)
    loop.state.nodes[key] = values
    loop.update(loop.state)
  })
})

var vdom = require('virtual-dom'), h = vdom.h
var main = require('main-loop')
var loop = main({ nodes: {}, ways: {} }, render, vdom)

var root = document.querySelector('#content')
root.replaceChild(loop.target, root.childNodes[0])

kv.createReadStream()
  .on('data', function (row) {
    loop.state.nodes[row.key] = row.values
    loop.update(loop.state)
  })

function render (state) {
  return h('div', [
    h('h1', 'replicate'),
    h('form', { onsubmit: replicate }, [
      h('input', {
        type: 'text',
        name: 'url',
        placeholder: 'ws://host:port'
      }),
      h('button', { type: 'submit' }, 'replicate')
    ]),
    h('h1', 'create'),
    h('form', { onsubmit: create }, [
      h('div', [
        'lat',
        h('input', { type: 'text', name: 'lat' }),
      ]),
      h('div', [
        'lon',
        h('input', { type: 'text', name: 'lon' })
      ]),
      h('div', [
        h('button', { type: 'submit' }, 'create')
      ])
    ]),
    h('div', [
      h('h2', 'nodes'),
      h('div', Object.keys(state.nodes).map(function (key) {
        var values = state.nodes[key]
        return h('div',
          Object.keys(values).map(function (link) {
            var node = values[link]
            return h('div', [
              'id=' + key,
              ' ',
              'lat=' + node.lat,
              ' ',
              'lon=' + node.lon
            ])
          })
        )
      })),
      h('h2', 'ways')
      // ...
    ])
  ])

  function create (ev) {
    ev.preventDefault()
    var id = randombytes(8).toString('hex')
    var value = {
      lat: this.elements.lat.value,
      lon: this.elements.lon.value,
    }
    kv.put(id, value, function (err, node) {
      if (err) console.error(err)
    })
  }
  function replicate (ev) {
    ev.preventDefault()
    var stream = wsock(this.elements.url.value)
    stream.pipe(log.replicate()).pipe(stream)
  }
}
