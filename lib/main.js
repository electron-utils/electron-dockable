'use strict';

const {BrowserWindow, shell} = require('electron');
const ipcPlus = require('electron-ipc-plus');
const windowPlus = require('electron-window-plus');

// ==========================
// exports
// ==========================

/**
 * @module dockable
 */
module.exports = {
  /**
   * @method init
   * @param {object} opts
   */
  init (opts) {
    if ( opts.layout ) {
      _layout = opts.layout;
    }

    // windowPlus events
    windowPlus.on('manage', (win) => {
      win.webContents.on('dom-ready', () => {
        win.webContents.insertCSS(_css);
      });

      win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
      });
    });
  },

  get windows () {
    return windowPlus;
  },

  get css () {
    return _css;
  },
};

// ==========================
// internals
// ==========================

let _layout = {};
let _css = `
  .dock-mask {
    position: fixed;
    pointer-events: none;
    z-index: 999;
    box-sizing: border-box;
  }

  .dock-mask.dock {
    background: rgba(0,128,255,0.3);
    border: 2px solid #09f;
  }

  .dock-mask.tab {
    background: rgba(0,128,255,0.3);
    border: '';
  }
`;

// ==========================
// ipc
// ==========================

ipcPlus.on('electron-dockable:query-layout', ( event ) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  let userdata = windowPlus.getUserData(win);

  // if the window is not managed, return default layout;
  if (!userdata) {
    event.reply(null, _layout);
    return;
  }

  // if we found the layout in the dockableWin, return it
  let layout = userdata.layout;
  if ( layout ) {
    event.reply(null, layout);
    return;
  }

  // if no layout found, and it is main window, reload layout
  if ( windowPlus.main === win ) {
    event.reply(null, _layout);
    return;
  }

  event.reply(new Error('No layout found for this window'));
});

ipcPlus.on('electron-dockable:save-layout', ( event, info ) => {
  let win = BrowserWindow.fromWebContents( event.sender );
  windowPlus.updateUserData(win, {
    layout: info
  });
  windowPlus.save();
});