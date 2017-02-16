'use strict';

const {BrowserWindow, screen, shell} = require('electron');
const EventEmitter = require('events');
const _ = require('lodash');
const fs = require('fs');
const url_ = require('url');
const profile = require('electron-profile');
const protocol = require('electron-protocol');
const ipcPlus = require('electron-ipc-plus');
const panel = require('electron-panel');

const profileVersion = '1.0.0';

let _windows = [];
let _windowsProfile = null;
let _mainwin = null;
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

function _addWindow ( win ) {
  _windows.push(win);
}

function _removeWindow ( win ) {
  let idx = _windows.indexOf(win);
  if ( idx === -1 ) {
    console.warn( `Cannot find window ${win.name}` );
    return;
  }
  _windows.splice(idx,1);
}

/**
 * @class DockableWindow
 * @extends EventEmitter
 * @constructor
 * @param {string} name - The window name
 * @param {object} options - The options use [Electron's BrowserWindow options](http://electron.atom.io/docs/api/browser-window/#new-browserwindowoptions)
 * with the following additional field:
 * @param {boolean} options.save - Indicate if save the window position and size, default: true
 *
 * Window class for operating dockable window.
 */
class DockableWindow extends EventEmitter {
  constructor ( name, options ) {
    super();
    options = options || {};

    // set default value for options
    _.defaultsDeep(options, {
      width: 400,
      height: 300,
      acceptFirstMouse: true, // NOTE: this will allow mouse click works when window is not focused
      disableAutoHideCursor: true, // NOTE: this will prevent hide cursor when press "space"
      backgroundColor: '#eee',
      resizable: true,
      alwaysOnTop: false,
      // titleBarStyle: 'hidden', // TODO
      // vibrancy: 'dark', // TODO
      webPreferences: {
        preload: `${__dirname}/preload.js`,
        // defaultFontFamily: {
        //   standard: 'Helvetica Neue',
        //   serif: 'Helvetica Neue',
        //   sansSerif: 'Helvetica Neue',
        //   monospace: 'Helvetica Neue',
        // },
      },
      defaultFontSize: 13,
      defaultMonospaceFontSize: 13,
    });

    this._currentSessions = {};
    this._layout = null;

    // load window info from profile://local/layout.windows.json
    if ( _windowsProfile ) {
      let profileData = _windowsProfile.data;
      if ( profileData.windows && profileData.windows[name] ) {
        this._layout = profileData.windows[name].layout;
      }
    }

    // init options
    this.name = name;
    this.save = options.save;

    if ( typeof this.save !== 'boolean' ) {
      this.save = true;
    }

    this._browserWin = new BrowserWindow(options);

    // adjust window position to make it open in the same display screen as main window
    if ( options.x === undefined && options.y === undefined && DockableWindow.main ) {
      let display = screen.getDisplayMatching( DockableWindow.main._browserWin.getBounds() );
      let size = this._browserWin.getSize();
      let x = (display.workArea.width - size[0]) * 0.5;
      let y = (display.workArea.height - size[1]) * 0.5;
      x = Math.floor(x);
      y = Math.floor(y);

      if ( x < 0 || y < 0 ) {
        this._browserWin.setPosition( display.workArea.x, display.workArea.y );
        // NOTE: if we don't do this, the center will not work
        setImmediate(() => {
          this._browserWin.center();
        });
      } else {
        this._browserWin.setPosition(x, y);
      }
    }

    // ======================
    // BrowserWindow events
    // ======================

    this._browserWin.on('close', () => {
      // NOTE: I cannot put these in 'closed' event. In Windows, the getBounds will return
      //       zero width and height in 'closed' event
      DockableWindow._saveWindowStates();
    });

    this._browserWin.on('closed', () => {
      _removeWindow(this);
      this.dispose();
    });

    this._browserWin.on('unresponsive', event => {
      console.error( `DockableWindow "${this.name}" unresponsive: ${event}` );
    });

    // ======================
    // WebContents events
    // ======================

    // order: did-navigate -> dom-ready -> did-frame-finish-load -> did-finish-load

    this._browserWin.webContents.on('did-navigate', () => {
      this._browserWin.webContents.insertCSS(_css);
    });

    this._browserWin.webContents.on('crashed', event => {
      console.error( `DockableWindow "${this.name}" crashed: ${event}` );
    });

    this._browserWin.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });

    // NOTE: window must be add after _browserWin assigned
    _addWindow(this);
  }

  /**
   * @method dispose
   *
   * Dereference the native window.
   */
  dispose () {
    // NOTE: Important to dereference the window object to allow for GC
    this._browserWin = null;
  }

  /**
   * @method load
   * @param {string} url
   * @param {object} argv
   *
   * Load page by url, and send `argv` in query property of the url.
   * The renderer process will parse the `argv` when the page is ready and save it in `Editor.argv` in renderer process.
   */
  load ( url, argv ) {
    url = protocol.url(url);
    if ( !url ) {
      console.error( `Failed to load page ${url} for window "${this.name}"` );
      return;
    }

    this._url = url;
    let argvHash = argv ? encodeURIComponent(JSON.stringify(argv)) : undefined;

    // if this is an exists local file
    if ( fs.existsSync(url) ) {
      url = url_.format({
        protocol: 'file',
        pathname: url,
        slashes: true,
        hash: argvHash
      });
      this._browserWin.loadURL(url);

      return;
    }

    // otherwise we treat it as a normal url
    if ( argvHash ) {
      url = `${url}#${argvHash}`;
    }
    this._browserWin.loadURL(url);
  }

  /**
   * @method forceClose
   *
   * Force close the window
   */
  forceClose () {
    // NOTE: I cannot put these in 'closed' event. In Windows, the getBounds will return
    //       zero width and height in 'closed' event
    DockableWindow._saveWindowStates();

    if (this._browserWin) {
      this._browserWin.destroy();
    }
  }

  /**
   * @method adjust
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   *
   * Try to adjust the window to fit the position and size we give
   */
  adjust ( x, y, w, h ) {
    let adjustToCenter = false;

    if ( typeof x !== 'number' ) {
      adjustToCenter = true;
      x = 0;
    }

    if ( typeof y !== 'number' ) {
      adjustToCenter = true;
      y = 0;
    }

    if ( typeof w !== 'number' || w <= 0 ) {
      adjustToCenter = true;
      w = 800;
    }

    if ( typeof h !== 'number' || h <= 0 ) {
      adjustToCenter = true;
      h = 600;
    }

    let display = screen.getDisplayMatching( { x: x, y: y, width: w, height: h } );
    this._browserWin.setSize(w,h);
    this._browserWin.setPosition( display.workArea.x, display.workArea.y );

    if ( adjustToCenter ) {
      this._browserWin.center();
    } else {
      this._browserWin.setPosition( x, y );
    }
  }

  /**
   * @method resetLayout
   * @param {string} [url]
   *
   * Reset the dock layout of current window via `url`
   */
  resetLayout ( info ) {
    ipcPlus._closeAllSessions();
    this.send('dockable:reset-layout', info);
  }

  /**
   * @method emptyLayout
   *
   * Clear all panels docked in current window.
   */
  emptyLayout () {
    this.resetLayout(null);
  }

  // ========================================
  // properties
  // ========================================

  /**
   * @property {Boolean} isMainWindow
   *
   * If this is a main window.
   */
  get isMainWindow () {
    return DockableWindow.main === this;
  }

  // ========================================
  // static window operation
  // ========================================

  /**
   * @property {Array} windows
   * @static
   *
   * The current opened windows.
   */
  static get windows () {
    return _windows.slice();
  }

  /**
   * @property {Editor.DockableWindow} main
   * @static
   *
   * The main window.
   */
  static set main (value) { return _mainwin = value; }
  static get main () { return _mainwin; }

  /**
   * @method find
   * @static
   * @param {string|BrowserWindow|BrowserWindow.webContents} param
   * @return {Editor.DockableWindow}
   *
   * Find window by name or by BrowserWindow instance
   */
  static find ( param ) {
    // param === string
    if ( typeof param === 'string' ) {
      for ( let i = 0; i < _windows.length; ++i ) {
        let win = _windows[i];
        if ( win.name === param )
          return win;
      }

      return null;
    }

    // param === BrowserWindow
    if ( param instanceof BrowserWindow ) {
      for ( let i = 0; i < _windows.length; ++i ) {
        let win = _windows[i];
        if ( win._browserWin === param ) {
          return win;
        }
      }

      return null;
    }

    // param === WebContents (NOTE: webContents don't have explicit constructor in electron)
    for ( let i = 0; i < _windows.length; ++i ) {
      let win = _windows[i];
      if ( win._browserWin && win._browserWin.webContents === param ) {
        return win;
      }
    }

    return null;
  }

  /**
   * @method getWindowStateForPanel
   * @static
   * @param {string} panelID
   *
   * The standalone panel window state.
   */
  static getWindowStateForPanel (panelID) {
    if ( _windowsProfile ) {
      let panelState = _windowsProfile.data.panels[panelID];
      if ( panelState ) {
        return {
          x: panelState.x,
          y: panelState.y,
          width: panelState.width,
          height: panelState.height,
        };
      }
    }

    return {};
  }

  // Save current window's state to profile `layout.windows.json` at `local`
  static _saveWindowStates () {
    // we've quit the app, do not save layout after that.
    if ( !DockableWindow.main ) {
      return;
    }

    // we don't load the windows profile, don't save any.
    if ( !_windowsProfile ) {
      return;
    }

    //
    let profileData = _windowsProfile.data;
    profileData.version = profileVersion;
    profileData.windows = {};

    for ( let i = 0; i < _windows.length; ++i ) {
      let dockableWin = _windows[i];
      let winBounds = dockableWin._browserWin.getBounds();
      let panels = panel.getPanels(dockableWin._browserWin.id);

      if ( !dockableWin.save ) {
        profileData.windows[dockableWin.name] = {};
      } else {
        if ( !winBounds.width ) {
          console.warn(`Failed to commit window state. Invalid window width: ${winBounds.width}`);
          winBounds.width = 800;
        }

        if ( !winBounds.height ) {
          console.warn(`Failed to commit window state. Invalid window height ${winBounds.height}`);
          winBounds.height = 600;
        }

        profileData.windows[dockableWin.name] = {
          main: dockableWin.isMainWindow,
          url: dockableWin._url,
          windowType: dockableWin.windowType,
          x: winBounds.x,
          y: winBounds.y,
          width: winBounds.width,
          height: winBounds.height,
          layout: dockableWin._layout,
          // NOTE: This is for simple window, when it restored it doesn't know it has panel before.
          panels: panels,
        };
      }

      // save the position and size for standalone panel window
      // NOTE: only when panel is the only one in the window and the window is not the main window
      if ( !dockableWin.isMainWindow && panels.length === 1 ) {
        let panelID = panels[0];

        _windowsProfile.data.panels[panelID] = {
          x: winBounds.x,
          y: winBounds.y,
          width: winBounds.width,
          height: winBounds.height,
        };
      }
    }
    _windowsProfile.save();
  }

  // NOTE: this will be invoked in `app.ready` after electron-profile inited
  static _loadWindowStates () {
    _windowsProfile = profile.load('profile://local/dockable.layout.json', {
      version: profileVersion,
      windows: {},
      panels: {},
    });

    // reset layout if the version is not the same
    if ( _windowsProfile.data.version !== profileVersion ) {
      _windowsProfile.reset({
        version: profileVersion,
        windows: {},
        panels: {},
      });
    }
  }

  // restore window states
  static _restoreWindowStates (opts) {
    if ( _windowsProfile ) {
      // clone the opts
      let opts2 = Object.assign({}, opts);

      for ( let name in _windowsProfile.data.windows ) {
        let state = _windowsProfile.data.windows[name];
        if ( !protocol.url(state.url) ) {
          continue;
        }

        let win;

        if ( state.main ) {
          opts2.show = false;
          opts2.windowType = state.windowType;

          win = new DockableWindow(name, opts2);
          DockableWindow.main = win;
        } else {
          win = new DockableWindow(name, {
            show: false,
            windowType: state.windowType,
          });
        }

        // if this is a sub panel window
        if ( !state.main && state.panels && state.panels.length ) {
          win._browserWin.setMenuBarVisibility(false);
        }

        win.adjust(state.x, state.y, state.width, state.height);
        win.show();
        win.load(state.url);
      }

      // NOTE: restored when we have one more window and also have a window set as main.
      if ( DockableWindow.main ) {
        DockableWindow.main.focus();
        return true;
      }
    }

    return false;
  }
} // end class DockableWindow

module.exports = DockableWindow;
