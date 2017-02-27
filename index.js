'use strict';

const platform = require('electron-platform');
const pkgJson = require('./package.json');

let dockable;
let name = `__electron_dockable__`;
let msg = `Failed to require ${pkgJson.name}@${pkgJson.version}:
  A different version of ${pkgJson.name} already running in the process, we will redirect to it.
  Please make sure your dependencies use the same version of ${pkgJson.name}.`;

if ( platform.isMainProcess ) {
  if (global[name]) {
    console.warn(msg);
    dockable = global[name];
  } else {
    dockable = global[name] = require('./lib/main');
  }
} else {
  if (window[name]) {
    console.warn(msg);
    dockable = window[name];
  } else {
    dockable = window[name] = require('./lib/renderer/index');
  }
}

// ==========================
// exports
// ==========================

module.exports = dockable;
