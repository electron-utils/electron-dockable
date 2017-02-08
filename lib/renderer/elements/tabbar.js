'use strict';

const {droppable} = require('electron-drag-drop');
const utils = require('../utils');

// ==========================
// exports
// ==========================

class TabBar extends window.HTMLElement {
  createdCallback () {
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="border">
        <div class="tabs">
          <content select="ui-dock-tab"></content>
        </div>

        <div id="popup" class="icon">
          <i class="icon-popup"></i>
        </div>
        <div id="menu" class="icon">
          <i class="icon-menu"></i>
        </div>
        <div id="insertLine" class="insert"></div>
      </div>
    `;

    // TODO
    // this.shadowRoot.insertBefore(
    //   DomUtils.createStyleElement('theme://elements/tabs.css'),
    //   this.shadowRoot.firstChild
    // );

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

