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

ipcRenderer.on('electron-dockable:reset', (event, info) => {
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

document.addEventListener('readystatechange', () => {
  if ( document.readyState === 'interactive' ) {
    // NOTE: we should define in order of dependencies
    // This is because, when we load a index.html with predefined custom element in it.
    // The custom-elements' constructor will be trigger immediately during `customElements.define` invokes.
    window.customElements.define('ui-dock-resizer', Resizer);
    window.customElements.define('ui-dock-tab', Tab);
    window.customElements.define('ui-dock-tabbar', TabBar);
    window.customElements.define('ui-panel-group', PanelGroup);
    window.customElements.define('ui-dock-area', DockArea);
    window.customElements.define('ui-workspace', Workspace);
  }
});
