'use strict';

const {ipcRenderer} = require('electron');
const utils = require('./utils');

const Workspace = require('./elements/workspace');
const DockArea = require('./elements/dock-area');
const PanelGroup = require('./elements/panel-group');
const Tab = require('./elements/tab');
const TabBar = require('./elements/tabbar');
const Resizer = require('./elements/resizer');

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

// ==========================
// custom elements
// ==========================

document.registerElement('ui-workspace', Workspace);
document.registerElement('ui-dock-area', DockArea);
document.registerElement('ui-panel-group', PanelGroup);
document.registerElement('ui-dock-tab', Tab);
document.registerElement('ui-dock-tabbar', TabBar);
document.registerElement('ui-dock-resizer', Resizer);
