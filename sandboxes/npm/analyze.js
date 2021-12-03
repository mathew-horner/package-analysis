#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { argv } = require('process');

function install(package) {
  // Specify the package to install.
  const installPkg = package.localFile
    ? package.localFile
    : (package.version
      ? `${package.name}@${package.version}`
      : package.name);

  let result = spawnSync('npm', ['init', '--force'], { stdio: 'inherit' });
  if (result.status != 0) {
    throw 'Failed to init npm';
  }

  result = spawnSync('npm', ['install', installPkg], { stdio: 'pipe', encoding: 'utf8' });
  console.log(result.stdout + result.stderr);

  if (result.status == 0) {
    console.log('Install succeeded.');
  } else {
    if (result.stderr.includes('is not in the npm registry.')) {
      process.exit(0);
    }
    console.log('Install failed.');
    process.exit(1);
  }
}

function importPkg(package) {
  try {
    require(package.name);
  } catch (e) {
    console.log(`Failed to import ${package.name}: ${e}`);
  }  
}

const phases = new Map([
  ['all', [install, importPkg]],
  ['install', [install]],
  ['import', [importPkg]]
]);

const nodeBin = argv.shift();
const scriptPath = argv.shift();

if (argv.length < 2 || argv > 4) {
  console.log(`Usage: ${nodeBin} ${scriptPath} [--local file | --version version] phase pkg`);
  process.exit(1);
}

// Parse the arguments manually to avoid introducing unnecessary dependencies
// and side effects that add noise to the strace output.
var localFile = null;
var ver = null;
switch (argv[0]) {
  case '--local':
    argv.shift();
    localFile = argv.shift();
    break;
  case '--version':
    argv.shift();
    ver = argv.shift();
    break;
}

const phase = argv.shift();
const pkg = argv.shift();
const package = {
  name: pkg,
  version: ver,
  localFile: localFile,
};

if (!phases.keys().includes(phase)) {
  console.log(`Unknown phase ${phase} specified.`);
  process.exit(1);
}

// Execute the phase
phases[phase].forEach((f) => f(package));