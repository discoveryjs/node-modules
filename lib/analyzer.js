const path = require('path');
const resolve = require('resolve-from');

function findPackageConsumerDir(pkgPath, basedir) {
    const parts = pkgPath.split(path.sep);
    const lastNodeModulesIndex = parts.lastIndexOf('node_modules', parts.length);

    if (lastNodeModulesIndex === -1) {
        return '';
    }

    return path.join(basedir, ...parts.slice(0, lastNodeModulesIndex));
}

function resolveDeps(file, dict, type, basedir) {
    const pkgBasedir = path.join(basedir, file.filename);

    for (let name in dict) {
        let resolved = resolve.silent(
            pkgBasedir,
            name + '/package.json'
        );

        if (resolved) {
            resolved = path.dirname(path.relative(basedir, resolved));
        } else {
            file.error(`Can't resolve "${name}" package`);
        }

        file.deps.push({
            type,
            name,
            version: dict[name],
            resolved: resolved
        });
    }
}

module.exports = function packageJsonAnalyzer(file, content, { basedir }) {
    const dir = path.dirname(file.filename);
    const pkg = JSON.parse(content);
    const entry = resolve.silent(findPackageConsumerDir(dir, basedir), pkg.name);

    file.path = dir;
    file.pkg = pkg;
    file.deps = [];
    file.entry = entry && path.relative(dir, entry);

    resolveDeps(file, pkg.optionalDependencies, 'optional', basedir);
    resolveDeps(file, pkg.peerDependencies, 'peer', basedir);
    resolveDeps(file, pkg.dependencies, 'prod', basedir);

    if (file.filename === 'package.json') {
        resolveDeps(file, pkg.devDependencies, 'dev', basedir);
    }
};
