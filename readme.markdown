# offline-map-editor

offline map editor prototype

to run:

```
$ npm install -g browserify ecstatic
$ browserify main.js > bundle.js
$ ecstatic -p . 8005
```

to replicate (not currently working):

```
$ npm install -g wsnc forkdb dupsh
$ dupsh 'forkdb replicate -d test.db' 'wsnc -l 5000'
```

Use `ws://localhost:5000` as the replicate url.

