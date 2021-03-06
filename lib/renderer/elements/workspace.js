'use strict';

// requires
const {drag} = require('electron-drag-drop');
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

    // init behaviors
    this._initDockable();

    // init resizer
    this._initResizers();

    // init events
    this._initEvents();

    utils.root = this; // DELME???
    utils.loadLayout((err,layout) => {
      if ( err ) {
        console.error(`Failed to load layout: ${err.stack}`);
        return;
      }

      this.reset(layout);

      // TODO: use shadow root focus???
      // FocusMgr._setFocusPanelFrame(null);
    });
  }

  /**
   * @method finalize
   */
  finalize () {
    super.finalize();
    utils.adjustWindow();
  }

  /**
   * @method dumpLayout
   */
  dumpLayout () {
    let childInfos = [];

    for ( let i = 0; i < this.children.length; ++i ) {
      let childEL = this.children[i];

      if ( !childEL.isDockable ) {
        continue;
      }

      childInfos.push(childEL.dumpLayout());
    }

    let result = {
      type: this.row ? 'dock-area-h' : 'dock-area-v',
      children: childInfos,
    };

    return result;
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
}

module.exports = Workspace;
