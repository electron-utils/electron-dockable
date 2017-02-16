'use strict';

const ipcPlus = require('electron-ipc-plus');
// TODO: const DockableWindow = require('./dockable-window');

let _layout = {};

/**
 * @module dockable
 */
module.exports = {
  // TODO: DockableWindow,

  /**
   * @method init
   * @param {object} opts
   */
  init (opts) {
    if ( opts.layout ) {
      _layout = opts.layout;
    }
  },

  /**
   * @method run
   */
  run () {
    // TODO: restore the windows
  },
};

// ==========================
// ipc
// ==========================

ipcPlus.on('dockable:query-layout', ( event ) => {
  // TODO
  // let win = BrowserWindow.fromWebContents( event.sender );
  // let layout = win._layout;

  // // NOTE: we can not put this code in Window constructor, since we can not decide if this is a main window there.
  // // if no layout found, and it is main window, reload layout
  // if ( isMainWindow(win) && !layout ) {
  //   let layoutPath = protocol.url(_defaultLayoutUrl);

  //   if ( fs.existsSync(layoutPath) ) {
  //     try {
  //       layout = JSON.parse(fs.readFileSync(layoutPath));
  //     } catch (err) {
  //       Console.error( `Failed to load default layout: ${err.message}` );
  //       layout = null;
  //     }
  //   }
  // }

  //
  event.reply(null, _layout);
});
