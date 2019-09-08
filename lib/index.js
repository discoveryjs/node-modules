const scanFs = require('@discoveryjs/scan-fs');
const packageJsonAnalyzer = require('./analyzer');

function addToCluster(pkgRef, cluster, pathToFile) {
    const resolved = pathToFile.get(pkgRef.resolved);

    if (!resolved || cluster.has(resolved)) {
        return;
    }

    cluster.add(resolved);
    resolved.deps.forEach(dep => addToCluster(dep, cluster, pathToFile));
}

function fetchNodeModules(basedir) {
    return scanFs({
        basedir,
        include: [
            'node_modules',
            'package.json'
        ],
        rules: {
            // NOTE: some packages contain package.json file in its own folders
            // (i.e. beside root location), therefore /\/package.json$/ regexp may give
            // false positive matches and broken references as well
            test: /^(node_modules\/(@[^/]+\/)?[^/]+\/)*package\.json$/,
            extract: packageJsonAnalyzer
        }
    }).then(files => {
        const prodDeps = new Set();
        const devDeps = new Set();
        const main = files.find(file => file.filename === 'package.json');

        // build dev/prod clusters
        // when no main package.json -> all modules are prod, do nothing
        if (main) {
            const pathToFile = files.reduce(
                (map, file) => map.set(file.path, file),
                new Map()
            );

            main.deps.forEach(dep => addToCluster(
                dep,
                dep.type === 'dev' ? devDeps : prodDeps,
                pathToFile
            ));
        }

        // map result
        return files.map(file => ({
            name: file.pkg.name,
            version: file.pkg.version || null,
            dev: devDeps.has(file) && !prodDeps.has(file),
            path: file.path,
            entry: file.entry,
            deps: file.deps,
            packageJson: file.pkg
        }));
    });
};

module.exports = fetchNodeModules;
module.exports.analyzer = packageJsonAnalyzer;
