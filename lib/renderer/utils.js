'use strict';

/**
 * @module utils
 */
let utils = {};
module.exports = utils;

// requires
const {remote} = require('electron');
const ipcPlus = require('electron-ipc-plus');
const {drag} = require('electron-drag-drop');
const panel = require('electron-panel');

const _resizerSpace = 3; // HACK: magic number, means resizer's size
const _tabbarSpace = 20; // HACK: magic number, means tabbar's size
const _panelSpace = 2;   // HACK: magic number, means panel's size

let _resultDock = null;
let _potentialDocks = [];
let _dockMask = null;

let _dragenterCnt = 0;

// ==========================
// exports
// ==========================

/**
 * @property root
 */
utils.root = null;

/**
 * @property resizerSpace
 */
Object.defineProperty( utils, 'resizerSpace', {
  enumerable: true,
  get () { return _resizerSpace; },
});

/**
 * @property tarbarSpace
 */
Object.defineProperty( utils, 'tabbarSpace', {
  enumerable: true,
  get () { return _tabbarSpace; },
});

/**
 * @property panelSpace
 */
Object.defineProperty( utils, 'panelSpace', {
  enumerable: true,
  get () { return _panelSpace; },
});

/**
 * @method dragstart
 */
utils.dragstart = function ( event, tabEL ) {
  let frameEL = tabEL.frameEL;
  let panelID = frameEL.id;
  let panelGroup = frameEL.parentNode;
  let panelRect = panelGroup.getBoundingClientRect();

  let draggingInfo = {
    panelID: panelID,
    panelRectWidth: panelRect.width,
    panelRectHeight: panelRect.height,
    panelPreferredWidth: panelGroup._preferredWidth,
    panelPreferredHeight: panelGroup._preferredHeight,
  };

  drag.start(event.dataTransfer, {
    effect: 'move',
    type: 'dockable-tab',
    items: draggingInfo,
  });
};

/**
 * @method dragend
 */
utils.dragend = function () {
  // reset internal states
  _resetDragDrop();

  drag.end();
};

/**
 * @method dragoverTab
 */
utils.dragoverTab = function ( target ) {
  remote.getCurrentWindow().focus();

  // clear docks hints
  _potentialDocks = [];
  _resultDock = null;

  if ( _dockMask ) {
    _dockMask.remove();
  }

  let rect = target.getBoundingClientRect();
  _updateMask ( 'tab', rect.left, rect.top, rect.width, rect.height+2 );
};

/**
 * @method dragleaveTab
 */
utils.dragleaveTab = function () {
  if ( _dockMask ) {
    _dockMask.remove();
  }
};

/**
 * @method dropTab
 */
utils.dropTab = function ( target, insertBeforeTabEL ) {
  let items = drag.items();
  let draggingInfo = items[0];
  let panelID = draggingInfo.panelID;
  let frameEL = panel.find(panelID);

  if ( frameEL ) {
    let panelGroup = frameEL.parentNode;
    let targetPanelGroup = target.panelGroup;

    let needCollapse = panelGroup !== targetPanelGroup;
    let currentTabEL = panelGroup.$tabbar.findTab(frameEL);

    if ( needCollapse ) {
      panelGroup.closeNoCollapse(currentTabEL);
    }

    //
    let idx = targetPanelGroup.insert( currentTabEL, frameEL, insertBeforeTabEL );
    targetPanelGroup.select(idx);

    if ( needCollapse ) {
      panelGroup._collapse();
    }

    // reset internal states
    _resetDragDrop();

    //
    utils.finalize();
    utils.saveLayout();

    // NOTE: you must focus after utils flushed
    // NOTE: do not use panelGroup focus, the activeTab is still not assigned
    frameEL.focus();

    // TODO
    // if ( panel.isOutOfDate(frameEL.id) ) {
    //   targetPanelGroup.outOfDate(frameEL);
    // }
  } else {
    panel.close(panelID, (err, closed) => {
      if ( err ) {
        console.error(`Failed to close panel ${panelID}: ${err.stack}`);
        return;
      }

      if ( !closed ) {
        return;
      }

      panel.newFrame(panelID, (err, frameEL) => {
        if ( err ) {
          console.error(err.stack);
          return;
        }

        window.requestAnimationFrame ( () => {
          let targetPanelGroup = target.panelGroup;
          let newTabEL = document.createElement('ui-dock-tab');
          newTabEL.name = frameEL.name;

          let idx = targetPanelGroup.insert( newTabEL, frameEL, insertBeforeTabEL );
          targetPanelGroup.select(idx);

          panel.dock(frameEL);

          // reset internal states
          _resetDragDrop();

          //
          utils.finalize();
          utils.saveLayout();

          // NOTE: you must focus after utils flushed
          // NOTE: do not use panelGroup focus, the activeTab is still not assigned
          frameEL.focus();

          // TODO
          // if ( panel.isOutOfDate(frameEL.id) ) {
          //   targetPanelGroup.outOfDate(frameEL);
          // }

          // start loading
          frameEL.load(err => {
            if ( err ) {
              console.error(err.stack);
              return;
            }

            if ( frameEL.ready ) {
              frameEL.ready();
            }
          });
        });
      });
    });
  }
};

/**
 * @method dragoverDockArea
 */
utils.dragoverDockArea = function ( target ) {
  let type = drag.type();
  if ( type !== 'dockable-tab' ) {
    return;
  }

  _potentialDocks.push(target);
};

/**
 * @method dragenterWorkspace
 */
utils.dragenterWorkspace = function () {
  ++_dragenterCnt;
};

/**
 * @method dragleaveWorkspace
 */
utils.dragleaveWorkspace = function () {
  --_dragenterCnt;

  if ( _dragenterCnt === 0 ) {
    if ( _dockMask ) {
      _dockMask.remove();
    }
  }
};

/**
 * @method dragoverWorkspace
 */
utils.dragoverWorkspace = function (x, y) {
  remote.getCurrentWindow().focus();

  let minDistance = null;
  _resultDock = null;

  for ( let i = 0; i < _potentialDocks.length; ++i ) {
    let hintTarget = _potentialDocks[i];
    let targetRect = hintTarget.getBoundingClientRect();
    let center_x = targetRect.left + targetRect.width/2;
    let center_y = targetRect.top + targetRect.height/2;
    let pos = null;

    let leftDist = Math.abs(x - targetRect.left);
    let rightDist = Math.abs(x - targetRect.right);
    let topDist = Math.abs(y - targetRect.top);
    let bottomDist = Math.abs(y - targetRect.bottom);
    let minEdge = 100;
    let distanceToEdgeCenter = -1;

    if ( leftDist < minEdge ) {
      minEdge = leftDist;
      distanceToEdgeCenter = Math.abs(y - center_y);
      pos = 'left';
    }

    if ( rightDist < minEdge ) {
      minEdge = rightDist;
      distanceToEdgeCenter = Math.abs(y - center_y);
      pos = 'right';
    }

    if ( topDist < minEdge ) {
      minEdge = topDist;
      distanceToEdgeCenter = Math.abs(x - center_x);
      pos = 'top';
    }

    if ( bottomDist < minEdge ) {
      minEdge = bottomDist;
      distanceToEdgeCenter = Math.abs(x - center_x);
      pos = 'bottom';
    }

    //
    if ( pos !== null && (minDistance === null || distanceToEdgeCenter < minDistance) ) {
      minDistance = distanceToEdgeCenter;
      _resultDock = { target: hintTarget, position: pos };
    }
  }

  if ( _resultDock ) {
    let items = drag.items();
    let draggingInfo = items[0];

    let rect = _resultDock.target.getBoundingClientRect();
    let maskRect = null;

    let panelPreferredWidth = draggingInfo.panelPreferredWidth;
    let panelPreferredHeight = draggingInfo.panelPreferredHeight;

    let hintWidth = panelPreferredWidth;
    if ( hintWidth >= Math.floor(rect.width) ) {
      hintWidth = Math.floor(rect.width * 0.5);
    }

    let hintHeight = panelPreferredHeight;
    if ( hintHeight >= Math.floor(rect.height) ) {
      hintHeight = Math.floor(rect.height * 0.5);
    }

    if ( _resultDock.position === 'top' ) {
      maskRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: hintHeight,
      };
    } else if ( _resultDock.position === 'bottom' ) {
      maskRect = {
        left: rect.left,
        top: rect.bottom-hintHeight,
        width: rect.width,
        height: hintHeight
      };
    } else if ( _resultDock.position === 'left' ) {
      maskRect = {
        left: rect.left,
        top: rect.top,
        width: hintWidth,
        height: rect.height
      };
    } else if ( _resultDock.position === 'right' ) {
      maskRect = {
        left: rect.right-hintWidth,
        top: rect.top,
        width: hintWidth,
        height: rect.height
      };
    }

    //
    _updateMask ( 'dock', maskRect.left, maskRect.top, maskRect.width, maskRect.height );
  } else {
    if ( _dockMask ) {
      _dockMask.remove();
    }
  }

  _potentialDocks = [];
};

/**
 * @method dropWorkspace
 */
utils.dropWorkspace = function (draggingInfo) {
  if ( _resultDock === null ) {
    return;
  }

  let panelID = draggingInfo.panelID;
  let panelRectWidth = draggingInfo.panelRectWidth;
  let panelRectHeight = draggingInfo.panelRectHeight;
  let panelPreferredWidth = draggingInfo.panelPreferredWidth;
  let panelPreferredHeight = draggingInfo.panelPreferredHeight;

  let targetEL = _resultDock.target;
  let dockPosition = _resultDock.position;

  let frameEL = panel.find(panelID);
  if ( !frameEL ) {
    panel.close(panelID, (err, closed) => {
      if ( err ) {
        console.error(`Failed to close panel ${panelID}: ${err.stack}`);
        return;
      }

      if ( !closed ) {
        return;
      }

      panel.newFrame(panelID, (err, frameEL) => {
        if ( err ) {
          console.error(err.stack);
          return;
        }

        window.requestAnimationFrame (() => {
          let newPanelGroup = document.createElement('ui-panel-group');
          newPanelGroup.appendChild(frameEL);
          newPanelGroup._preferredWidth = panelPreferredWidth;
          newPanelGroup._preferredHeight = panelPreferredHeight;

          //
          targetEL.addDock( dockPosition, newPanelGroup );

          panel.dock(frameEL);

          // reset internal states
          _resetDragDrop();

          //
          utils.finalize();
          utils.saveLayout();

          // NOTE: you must focus after utils flushed
          // NOTE: do not use panelGroup focus, the activeTab is still not assigned
          frameEL.focus();

          // TODO
          // if ( panel.isOutOfDate(frameEL.id) ) {
          //   newPanelGroup.outOfDate(frameEL);
          // }

          // start loading
          frameEL.load(err => {
            if ( err ) {
              console.error(err.stack);
              return;
            }

            if ( frameEL.ready ) {
              frameEL.ready();
            }
          });
        });
      });
    });

    return;
  }

  let panelGroup = frameEL.parentNode;

  if (
    targetEL === panelGroup &&
    targetEL.tabCount === 1
  ) {
    return;
  }

  let parentDock = panelGroup.parentNode;
  let hasSameParentBefore = parentDock === targetEL.parentNode;

  //
  let currentTabEL = panelGroup.$tabbar.findTab(frameEL);
  panelGroup.closeNoCollapse(currentTabEL);

  //
  let newPanelGroup = document.createElement('ui-panel-group');
  newPanelGroup.appendChild(frameEL);
  newPanelGroup._preferredWidth = panelPreferredWidth;
  newPanelGroup._preferredHeight = panelPreferredHeight;

  //
  targetEL.addDock( dockPosition, newPanelGroup, hasSameParentBefore );

  //
  let totallyRemoved = panelGroup.children.length === 0;
  panelGroup._collapse();

  // if we totally remove the panelGroup, check if targetDock has the ancient as panelGroup does
  // if that is true, add parentEL's size to targetDock's flex style size
  if ( totallyRemoved ) {
    let hasSameAncient = false;

    // if newPanelGroup and oldPanelGroup have the same parent, don't do the calculation.
    // it means newPanelGroup just move under the same parent dock in same direction.
    if ( newPanelGroup.parentNode !== parentDock ) {
      let sibling = newPanelGroup;
      let newParent = newPanelGroup.parentNode;

      while ( newParent && newParent.isDockable ) {
        if ( newParent === parentDock ) {
          hasSameAncient = true;
          break;
        }

        sibling = newParent;
        newParent = newParent.parentNode;
      }

      if ( hasSameAncient ) {
        let size = 0;

        if ( parentDock.row ) {
          size = sibling.offsetWidth + _resizerSpace + panelRectWidth;
          sibling._preferredWidth = size;
        } else {
          size = sibling.offsetHeight + _resizerSpace + panelRectHeight;
          sibling._preferredHeight = size;
        }

        sibling.style.flex = `0 0 ${size}px`;
      }
    }
  }

  // reset internal states
  _resetDragDrop();

  //
  utils.finalize();
  utils.saveLayout();

  // NOTE: you must focus after utils flushed
  // NOTE: do not use panelGroup focus, the activeTab is still not assigned
  frameEL.focus();

  // TODO
  // if ( panel.isOutOfDate(frameEL.id) ) {
  //   newPanelGroup.outOfDate(frameEL);
  // }
};

/**
 * @method collapse
 */
utils.collapse = function () {
  if ( !utils.root ) {
    return;
  }

  utils.root._collapseRecursively();
};

/**
 * @method finalize
 */
utils.finalize = function () {
  if ( !utils.root ) {
    return;
  }

  utils.root._finalizeMinMaxRecursively();
  utils.root._finalizePreferredSizeRecursively();
  utils.root._finalizeStyleRecursively();
  utils.root._reflowRecursively();
  utils.root._updatePreferredSizeRecursively();
  utils.root._notifyResize();

  utils.adjustWindow();
};

/**
 * @method resize
 */
utils.resize = function () {
  if ( !utils.root ) {
    return;
  }

  utils.root._reflowRecursively();
  utils.root._notifyResize();

  window.requestAnimationFrame ( () => {
    utils.root._updatePreferredSizeRecursively();
  });
};

/**
 * @method saveLayout
 */
utils.saveLayout = function () {
  window.requestAnimationFrame ( () => {
    if ( !utils.root ) {
      return;
    }

    ipcPlus.sendToMain('electron-dockable:save-layout', utils.root.dumpLayout());
  });
};

/**
 * @method loadLayout
 */
utils.loadLayout = function (cb) {
  ipcPlus.sendToMain('electron-dockable:query-layout', cb);
};

/**
 * @method loadDefaultLayout
 */
utils.loadDefaultLayout = function (cb) {
  ipcPlus.sendToMain('electron-dockable:query-default-layout', cb);
};

/**
 * @method isPanelGroup
 */
utils.isPanelGroup = function (el) {
  return el.tagName === 'UI-PANEL-GROUP';
};

/**
 * @method isDockResizer
 */
utils.isDockResizer = function (el) {
  return el.tagName === 'UI-DOCK-RESIZER';
};

/**
 * @method isTab
 */
utils.isTab = function (el) {
  return el.tagName === 'UI-DOCK-TAB';
};

/**
 * @method isTabBar
 */
utils.isTabBar = function (el) {
  return el.tagName === 'UI-DOCK-TABBAR';
};

/**
 * @method indexOf
 */
utils.indexOf = function ( el ) {
  if ( !el ) {
    return -1;
  }

  let parentEL = el.parentNode;

  for ( let i = 0, len = parentEL.children.length; i < len; ++i ) {
    if ( parentEL.children[i] === el ) {
      return i;
    }
  }

  return -1;
};

/**
 * @method addon
 */
utils.addon = function (obj, ...args) {
  obj = obj || {};
  for (let i = 0; i < args.length; ++i) {
    let source = args[i];

    for ( let name in source) {
      if ( !(name in obj) ) {
        _copyprop( name, source, obj);
      }
    }
  }
  return obj;
};

/**
 * @method adjustWindow
 */
utils.adjustWindow = function () {
  let root = utils.root;
  if ( !root ) {
    return;
  }

  let win = remote.getCurrentWindow();
  let winSize = win.getSize();
  let winWidth = winSize[0];
  let winHeight = winSize[1];

  // get min content size
  let dw = window.innerWidth - root.clientWidth;
  let dh = window.innerHeight - root.clientHeight;

  let minWidth = root._computedMinWidth + dw;
  let minHeight = root._computedMinHeight + dh;

  // set window minimum size
  dw = winWidth - window.innerWidth;
  dh = winHeight - window.innerHeight;

  minWidth = minWidth + dw;
  minHeight = minHeight + dh;

  win.setMinimumSize(minWidth, minHeight);

  // resize window if needed
  if ( winWidth < minWidth ) {
    winWidth = minWidth;
  }
  if ( winHeight < minHeight ) {
    winHeight = minHeight;
  }

  win.setSize( winWidth, winHeight );
};

// ==========================
// Internal
// ==========================

function _updateMask ( type, x, y, w, h ) {
  if ( !_dockMask ) {
    // add dock mask
    _dockMask = document.createElement('div');
    _dockMask.classList.add('dock-mask');
    _dockMask.oncontextmenu = function() { return false; };
  }

  if ( type === 'dock' ) {
    _dockMask.classList.remove('tab');
    _dockMask.classList.add('dock');
  } else if ( type === 'tab' ) {
    _dockMask.classList.remove('dock');
    _dockMask.classList.add('tab');
  }

  _dockMask.style.left = `${x}px`;
  _dockMask.style.top = `${y}px`;
  _dockMask.style.width = `${w}px`;
  _dockMask.style.height = `${h}px`;

  if ( !_dockMask.parentElement ) {
    document.body.appendChild(_dockMask);
  }
}

function _resetDragDrop () {
  if ( _dockMask ) {
    _dockMask.remove();
  }

  _resultDock = null;
  _dragenterCnt = 0;
}

function _getPropertyDescriptor(obj, name) {
  if (!obj) {
    return null;
  }

  let pd = Object.getOwnPropertyDescriptor(obj, name);
  return pd || _getPropertyDescriptor(Object.getPrototypeOf(obj), name);
}

function _copyprop(name, source, target) {
  let pd = _getPropertyDescriptor(source, name);
  Object.defineProperty(target, name, pd);
}
