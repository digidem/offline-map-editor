var randombytes = require('randombytes')
var xtend = require('xtend')

var level = require('level-browserify')
var db = level('whatever')
var forkdb = require('forkdb')
var fdb = forkdb(db)

var vdom = require('virtual-dom'), h = vdom.h
var main = require('main-loop')
var loop = main({ nodes: [], ways: [] }, render, vdom)

var root = document.querySelector('#content')
root.replaceChild(loop.target, root.childNodes[0])

function render (state) {
  return h('div', [
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
        loop.update(xtend(loop.state, {
          nodes: loop.state.nodes.concat({ key: key, value: node })
        }))
      })
      w.end(JSON.stringify(node))
    })
  }
}
