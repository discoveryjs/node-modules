# @discoveryjs/node-modules

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/node-modules.svg)](https://www.npmjs.com/package/@discoveryjs/node-modules)
[![Twitter](https://img.shields.io/badge/Twitter-@js_discovery-blue.svg)](https://twitter.com/js_discovery)

An utility for scan and analyze packages in `node_modules`. It uses file system scan to determine which package physical instances are exactly installed in `node_modules`.

Is a part of [Discovery.js](https://github.com/discoveryjs) projects.

<!-- TOC depthFrom:2 -->

- [How to use](#how-to-use)
- [API](#api)
    - [fetchNodeModules(basedir): Promise.<packages: Array>](#fetchnodemodulesbasedir-promisepackages-array)
    - [fetchNodeModules.analyzer(file, content, context)](#fetchnodemodulesanalyzerfile-content-context)
- [Examples](#examples)
- [License](#license)

<!-- /TOC -->

## How to use

Install:

```
npm install @discoveryjs/node-modules
```

Use:

```js
const fetchNodeModules = require('@discoveryjs/node-modules');

fetchNodeModules('absolute/path/to/project').then(packages => {
    // do something with found packages
});
```

See [examples](#examples) below.

## API

### fetchNodeModules(basedir): Promise.<packages: Array>

Main function to fetch a package list for a specified `basedir`. The method check `basedir` for `node_modules` and `package.json` to retrieve a package list. When `basedir` is not specified `process.cwd()` is using. Root `package.json` is optional and used to determine which packages are using for development purposes only.

A list of packages contains each physical instance of packages. That is, if a package has several copies of itself (e.g. due to various versions) all of them will be in the list. Each entry has following properties:
- `name` – value of `name` field in `package.json`
- `version` – value of `version` field in `package.json`; can be `null` for root `package.json`
- `dev` – boolean value, which `true` when a package is using for dev purposes only
- `path` – relative to `basedir` path to a package. It can be used as an unique identifier of a package instance (and `deps.resolved` use the same values for a reference)
- `entry` - relative to `path` path to an entry point module. It can be `null` when entry is not resolved
- `deps` - list of entries from `dependencies`, `peerDependencies` and `optionalDependencies` sections of `package.json`. `devDependencies` are included for root `package.json` only. Each entry has following properties:
    - `type` – one of `prod`, `peer`, `optional` or `dev`
    - `name` - a key from a dependency section
    - `version` - a value from a dependency section
    - `resolved` - resolved path to a package. It can be used to find a physical instance of package it refers to. It may contain `null`, if no physical instance of package is not found (Note: that's a missed dependency for `prod`, `peer` and `dev` dependencies, but not a problem for `optional`).
- `packageJson` - content of a `package.json` parsed with `JSON.parse()`

### fetchNodeModules.analyzer(file, content, context)

Analyzer to use with [@discoveryjs/scan-fs](https://github.com/discoveryjs/scan-fs):

```js
const scanFs = require('@discoveryjs/scan-fs');
const nodeModules = require('@discovery/node-modules');

scanFs({
    ...
    rules: [
        ...
        {
            test: /\/package\.json$/,
            extract: nodeModules.analyzer
        }
    ]
});
```

## Examples

```js
const fetchNodeModules = require('@discovery/node-modules');

fetchNodeModules(__dirname).then(modules => {
    const groupByName = modules.reduce(
        (map, entry) => map.set(entry.name, (map.get(entry.name) || []).concat(entry)),
        new Map()
    );

    // find packages with more than one physical instance
    // and sort by entry count from top to bottom
    const duplicates = [...groupByName]
        .filter(([, entries]) => entries.length > 1)
        .sort(([, a], [, b]) => b.length - a.length);
    
    // output findings
    duplicates.forEach(([name, entries]) => {
        console.log(`${name} (${entries.length} entries)`);
        entries.forEach(({ path, version }) => console.log(`  ${path} ${version}`));
    });
});
```

The same example but using [jora](https://github.com/discoveryjs/jora):

```js
const fetchNodeModules = require('@discovery/node-modules');
const jora = require('jora');

fetchNodeModules(__dirname).then(modules => {
    const duplicates = jora(`
        group(<name>).({ name: key, entries: value })
        .[entries.size() > 1]
        .sort(<entries.size()>)
        .reverse()
    `)(modules);
    
    // output findings
    duplicates.forEach(({ name, entries }) => {
        console.log(`${name} (${entries.length} entries)`);
        entries.forEach(({ path, version }) => console.log(`  ${path} ${version}`));
    });
});
```

Example of output in both cases:

```
ansi-regex (2 entries)
  node_modules/ansi-regex 3.0.0
  node_modules/strip-ansi/node_modules/ansi-regex 4.1.0
resolve-from (2 entries)
  node_modules/resolve-from 5.0.0
  node_modules/import-fresh/node_modules/resolve-from 4.0.0
...
```

## License

MIT
