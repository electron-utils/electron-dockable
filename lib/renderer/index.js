'use strict';

const {ipcRenderer} = require('electron');
const utils = require('./utils');
const dockable = require('./dockable');

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
module.exports = {
  utils,
  dockable,
  Workspace,
  DockArea,
  PanelGroup,
  Tab,
  TabBar,
  Resizer,
};

// ==========================
// ipc messages
// ==========================

ipcRenderer.on('electron-dockable:reset', (event, info) => {
  let workspace = document.querySelector('ui-work-space');
  if ( workspace ) {
    workspace.reset(info);
  }
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
