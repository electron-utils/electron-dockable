'use strict';

const {ipcRenderer} = require('electron');
const utils = require('./utils');

// ==========================
// exports
// ==========================

/**
 * @module dockable
 */
let dockable = {};
module.exports = dockable;

// ==========================
// ipc messages
// ==========================

ipcRenderer.on('dockable:reset', (event, info) => {
  utils.reset(utils.root, info, err => {
    if ( err ) {
      console.error(`Failed to reset layout: ${err.stack}`);
    }
  });
});

// ==========================
// dom events
// ==========================

window.addEventListener('resize', () => {
  utils.resize();
});

