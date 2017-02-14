'use strict';

const CleanCSS = require('clean-css');
const {droppable} = require('electron-drag-drop');
const utils = require('../utils');

// ==========================
// internals
// ==========================

let _css = `
  :host {
    position: relative;
    /* contain: content; CAN NOT USE THIS */

    box-sizing: border-box;
    font-size: 16px;
    font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue','Segoe UI','Oxygen','Ubuntu','Cantarell','Open Sans',sans-serif;

    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;

    height: 21px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    border-top: 1px solid black;
    border-bottom: 1px solid black;

    background: #656565;

    z-index: 1;
  }

  .tabs {
    position: relative;

    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;

    flex: 1;

    margin-bottom: -1px;

    height: 20px;
    padding-right: 20px;
    overflow: hidden;
  }

  .insert {
    display: none;
    position: absolute;
    box-sizing: border-box;
    height: 100%;

    pointer-events: none;
    border: 1px solid @tabmask_insert_color;
  }

  .icon {
    color: #777;
    margin-left: 10px;
  }

  .icon.hide {
    display: none;
  }

  .icon:hover {
    color: #aaa;
    cursor: pointer;
  }
`;

let _cleanCSS = new CleanCSS();
let _minified = _cleanCSS.minify(_css).styles;

// ==========================
// exports
// ==========================

class TabBar extends window.HTMLElement {
  constructor () {
    super();

    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="tabs">
        <slot></slot>
      </div>

      <div id="popup" class="icon">
        <i class="icon-popup"></i>
      </div>
      <div id="menu" class="icon">
        <i class="icon-menu"></i>
      </div>
      <div id="insertLine" class="insert"></div>
    `;

    // init style
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = _minified;
    this.shadowRoot.insertBefore( styleElement, this.shadowRoot.firstChild );

    // init
    this.activeTab = null;
    this._focused = false;

    // query element
    this.$popup = this.shadowRoot.querySelector('#popup');
    this.$menu = this.shadowRoot.querySelector('#menu');
    this.$insertLine = this.shadowRoot.querySelector('#insertLine');

    // init events
    this.addEventListener('drop-area-enter', this._onDropAreaEnter.bind(this));
    this.addEventListener('drop-area-leave', this._onDropAreaLeave.bind(this));
    this.addEventListener('drop-area-accept', this._onDropAreaAccept.bind(this));
    this.addEventListener('drop-area-move', this._onDropAreaMove.bind(this));

    this.addEventListener('mousedown', event => { event.preventDefault(); });
    this.addEventListener('click', this._onClick.bind(this));
    this.addEventListener('tab-click', this._onTabClick.bind(this));

    this.$popup.addEventListener('click', this._onPopup.bind(this));
    this.$menu.addEventListener('click', this._onMenuPopup.bind(this));

    // init droppable
    this.droppable = 'tab';
    this.multi = false;
    this._initDroppable(this);

    if ( this.children.length > 0 ) {
      this.select(this.children[0]);
    }
  }

  _setFocused ( focused ) {
    this._focused = focused;

    for ( let i = 0; i < this.children.length; ++i ) {
      let tabEL = this.children[i];
      tabEL.focused = focused;
    }
  }

  findTab ( frameEL ) {
    for ( let i = 0; i < this.children.length; ++i ) {
      let tabEL = this.children[i];
      if ( tabEL.frameEL === frameEL ) {
        return tabEL;
      }
    }

    return null;
  }

  insertTab ( tabEL, insertBeforeTabEL ) {
    // do nothing if we insert to ourself
    if ( tabEL === insertBeforeTabEL ) {
      return tabEL;
    }

    if ( insertBeforeTabEL ) {
      this.insertBefore(tabEL, insertBeforeTabEL);
    } else {
      this.appendChild(tabEL);
    }
    tabEL.focused = this._focused;

    return tabEL;
  }

  addTab ( name ) {
    let tabEL = document.createElement('ui-dock-tab');
    tabEL.name = name;

    this.appendChild(tabEL);
    tabEL.focused = this._focused;

    return tabEL;
  }

  removeTab ( tab ) {
    let tabEL = null;
    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( utils.isTab(tab) ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      if ( this.activeTab === tabEL ) {
        this.activeTab = null;

        let nextTab = tabEL.nextElementSibling;
        if ( !nextTab ) {
          nextTab = tabEL.previousElementSibling;
        }

        if ( nextTab ) {
          this.select(nextTab);
        }
      }

      tabEL.focused = false;
      this.removeChild(tabEL);
    }
  }

  select ( tab ) {
    let tabEL = null;

    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( utils.isTab(tab) ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      if ( tabEL !== this.activeTab ) {
        let oldTabEL = this.activeTab;

        if ( this.activeTab !== null ) {
          this.activeTab.classList.remove('active');
        }
        this.activeTab = tabEL;
        this.activeTab.classList.add('active');

        this.$popup.classList.toggle('hide', !tabEL.frameEL.popable);

        this.dispatchEvent(new window.CustomEvent('tab-changed', {
          bubbles: true,
          detail: {
            oldTab: oldTabEL,
            newTab: tabEL
          }
        }));
      }

      // TODO
      // NOTE: focus should after tab-changed, which will change the display style for panel frame
      // FocusMgr._setFocusPanelFrame(tabEL.frameEL);
    }
  }

  outOfDate ( tab ) {
    let tabEL = null;

    if ( typeof tab === 'number' ) {
      if ( tab < this.children.length ) {
        tabEL = this.children[tab];
      }
    } else if ( utils.isTab(tab) ) {
      tabEL = tab;
    }

    //
    if ( tabEL !== null ) {
      tabEL.outOfDate = true;
    }
  }

  _onClick ( event ) {
    event.stopPropagation();
    // TODO
    // FocusMgr._setFocusPanelFrame(this.activeTab.frameEL);
  }

  _onTabClick ( event ) {
    event.stopPropagation();
    this.select(event.target);
  }

  _onDropAreaEnter ( event ) {
    event.stopPropagation();
  }

  _onDropAreaLeave ( event ) {
    event.stopPropagation();

    utils.dragleaveTab(this);
    this.$insertLine.style.display = '';
  }

  _onDropAreaAccept ( event ) {
    event.stopPropagation();

    this.$insertLine.style.display = '';
    utils.dropTab(this, this._curInsertTab);
  }

  _onDropAreaMove ( event ) {
    event.stopPropagation();

    utils.dragoverTab(this);

    let dataTransfer = event.detail.dataTransfer;
    let eventTarget = event.detail.target;

    dataTransfer.dropEffect = 'move';

    //
    this._curInsertTab = null;
    let style = this.$insertLine.style;
    style.display = 'block';

    if ( utils.isTab(eventTarget) ) {
      style.left = eventTarget.offsetLeft + 'px';
      this._curInsertTab = eventTarget;
    } else {
      let el = this.lastElementChild;
      style.left = (el.offsetLeft + el.offsetWidth) + 'px';
    }
  }

  _onPopup ( event ) {
    event.stopPropagation();

    if ( this.activeTab ) {
      // TODO
      // let panelID = this.activeTab.frameEL.id;
      // Editor.Panel.popup(panelID);
    }
  }

  _onMenuPopup ( event ) {
    event.stopPropagation();

    // TODO
    // let rect = this.$menu.getBoundingClientRect();
    // let panelID = '';
    // let popable = true;

    // if ( this.activeTab ) {
    //   panelID = this.activeTab.frameEL.id;
    //   popable = this.activeTab.frameEL.popable;
    // }

    // TODO
    // Editor.Menu.popup([
    //   { label: Editor.T('PANEL_MENU.maximize'), dev: true, message: 'editor:panel-maximize', params: [panelID] },
    //   { label: Editor.T('PANEL_MENU.pop_out'), command: 'Editor.Panel.popup', params: [panelID], enabled: popable },
    //   { label: Editor.T('PANEL_MENU.close'), command: 'Editor.Panel.close', params: [panelID] },
    //   { label: Editor.T('PANEL_MENU.add_tab'), dev:true, submenu: [
    //   ]},
    // ], rect.left + 5, rect.bottom + 5);
  }
}

utils.addon(TabBar.prototype, droppable);

module.exports = TabBar;

