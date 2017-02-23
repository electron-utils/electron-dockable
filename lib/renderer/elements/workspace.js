'use strict';

// requires
const {drag} = require('electron-drag-drop');
const ipcPlus = require('electron-ipc-plus');
const utils = require('../utils');
const DockArea = require('./dock-area');

// ==========================
// exports
// ==========================

class Workspace extends DockArea {
  constructor () {
    super();
    this._inited = false;
  }

  connectedCallback () {
    if ( this._inited ) {
      return;
    }

    this._inited = true;
    this.noCollapse = true;

    this._initEvents();
    utils.root = this;

    this._loadLayout(err => {
      if ( err ) {
        console.error(`Failed to load layout: ${err.stack}`);
      }

      // TODO: use shadow root focus???
      // FocusMgr._setFocusPanelFrame(null);
    });
  }

  _finalizeStyle () {
    super._finalizeStyle();

    // NOTE: do not set minWidth and minHeight
    this.style.minWidth = '';
    this.style.minHeight = '';
  }

  _initEvents () {
    this.addEventListener('dragenter', event => {
      let type = drag.type(event.dataTransfer);
      if ( type !== 'dockable-tab' ) {
        return;
      }

      event.stopPropagation();

      utils.dragenterWorkspace();
    });

    this.addEventListener('dragleave', event => {
      let type = drag.type(event.dataTransfer);
      if ( type !== 'dockable-tab' ) {
        return;
      }

      event.stopPropagation();

      utils.dragleaveWorkspace();
    });

    this.addEventListener('dragover', event => {
      let type = drag.type(event.dataTransfer);
      if ( type !== 'dockable-tab' ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      drag.updateDropEffect(event.dataTransfer, 'move');

      utils.dragoverWorkspace(event.x, event.y);
    });

    this.addEventListener('drop', event => {
      let type = drag.type(event.dataTransfer);
      if ( type !== 'dockable-tab' ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let items = drag.items(event.dataTransfer);
      let draggingInfo = items[0];

      utils.dropWorkspace(draggingInfo);
    });
  }

  _loadLayout ( cb ) {
    ipcPlus.sendToMain('electron-dockable:query-layout', (err, layout) => {
      if ( err ) {
        if (cb) {
          cb (err);
        }
        return;
      }

      // NOTE: needReset implies this is a default layout
      utils.reset(this, layout, err => {
        if (cb) {
          cb (err);
        }
      });
    });
  }
}

module.exports = Workspace;
