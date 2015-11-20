var randombytes = require('randombytes')
var xtend = require('xtend')
var concat = require('concat-stream')
var wsock = require('websocket-stream')
var through = require('through2')

var level = require('level-browserify')
var db = level('whatever')
var forkdb = require('forkdb')
var fdb = forkdb(db, {
  store: require('idb-content-addressable-blob-store')()
})

fdb.on('create', function (hash) {
  fdb.get(hash, function (err, meta) {
    if (err) return console.error(err)
    fdb.createReadStream(hash).pipe(concat(readNode(meta.key)))
  })
})

var vdom = require('virtual-dom'), h = vdom.h
var main = require('main-loop')
var loop = main({ nodes: [], ways: [] }, render, vdom)

var root = document.querySelector('#content')
root.replaceChild(loop.target, root.childNodes[0])

fdb.keys(function (err, keys) {
  if (err) return console.error(err)
  keys.forEach(readKey)
})

function readKey (key) {
  fdb.forks(key.key, function (err, heads) {
    heads.forEach(function (head) {
      fdb.createReadStream(head.hash).pipe(concat(readNode(key.key)))
    })
  })
}

function readNode (key) {
  return function (body) {
    var node = JSON.parse(body)
    loop.update(xtend(loop.state, {
      nodes: loop.state.nodes.concat({ key: key, value: node })
    }))
  }
}

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
      h('div', state.nodes.map(function (node) {
        return h('div', [
          'id=' + node.key,
          ' ',
          'lat=' + node.value.lat,
          ' ',
          'lon=' + node.value.lon
        ])
      })),
      h('h2', 'ways')
      // ...
    ])
  ])

  function create (ev) {
    ev.preventDefault()
    var id = randombytes(8).toString('hex')
    var node = {
      lat: this.elements.lat.value,
      lon: this.elements.lon.value,
    }
    fdb.forks(id, function (err, heads) {
      var meta = { key: id, prev: heads }
      var w = fdb.createWriteStream(meta, function (err, key) {
        if (err) return console.error(err)
      })
      w.end(JSON.stringify(node))
    })
  }
  function replicate (ev) {
    ev.preventDefault()
    var stream = wsock(this.elements.url.value)
    stream.pipe(fdb.replicate()).pipe(stream)
  }
}
