// Makes the background service runnable on webOS TV 4.x (Node.js 0.12.2: ES5 only, no Object.assign, …).
// 1) esbuild bundles service/service.js + adhan-js   2) Babel → ES5 + core-js polyfills   3) esbuild re-bundles
// 4) acorn verifies the final file parses as pure ES5.
const { execFileSync } = require('child_process');
const fs = require('fs');
const babel = require('@babel/core');
const acorn = require('acorn');
const out = process.argv[2];
const tmp1 = out + '.stage1.js', tmp2 = out + '.stage2.js';
const esb = require.resolve('esbuild/bin/esbuild');
execFileSync(esb, ['service/service.js', '--bundle', '--platform=node', '--format=cjs', '--target=es2015',
  '--external:webos-service', '--outfile=' + tmp1, '--log-level=warning'], { stdio: 'inherit' });
// polyfills always included (some uses are indirect and not detected automatically)
const FORCE = ['es/math', 'es/object/assign', 'es/object/entries', 'es/object/values', 'es/array/find', 'es/array/includes',
  'es/array/from', 'es/array/fill', 'es/string/pad-start', 'es/string/includes', 'es/string/starts-with', 'es/symbol', 'es/number'];
const prelude = FORCE.map((m) => "require('core-js/" + m + "');").join('\n') + '\n';
const res = babel.transformSync(prelude + fs.readFileSync(tmp1, 'utf8'), {
  filename: 'service.js', babelrc: false, configFile: false, sourceType: 'script',
  targets: { node: '0.12' },
  presets: [['@babel/preset-env', { modules: false }]],
  plugins: [['polyfill-corejs3', { method: 'usage-global', version: require('core-js/package.json').version }]],
});
fs.writeFileSync(tmp2, res.code);
execFileSync(esb, [tmp2, '--bundle', '--platform=node', '--format=cjs', '--target=es5',
  '--external:webos-service', '--outfile=' + out, '--log-level=warning'], { stdio: 'inherit' });
fs.unlinkSync(tmp1); fs.unlinkSync(tmp2);
acorn.parse(fs.readFileSync(out, 'utf8'), { ecmaVersion: 5, sourceType: 'script' });   // throws on any ES6 syntax
console.log('✓ service is ES5 (Node 0.12 compatible): ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
