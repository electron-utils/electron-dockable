'use strict';

const platform = require('electron-platform');

let dockable;

if ( platform.isMainProcess ) {
  dockable = require('./lib/main');
} else {
  dockable = require('./lib/renderer/index');
}

// ==========================
// exports
// ==========================

module.exports = dockable;
