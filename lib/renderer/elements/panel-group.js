'use strict';

const CleanCSS = require('clean-css');
const utils = require('../utils');
const dockable = require('../dockable');

// ==========================
// internals
// ==========================

let _css = `
  :host {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;

    position: relative;
    box-sizing: border-box;
    contain: content;

    cursor: default;
    background: #eee;
  }

  :host(:focus) {
    outline: none;
  }

  .border {
    flex: 1;

    position: relative;
    border-left: 1px solid black;
    border-right: 1px solid black;
    border-bottom: 1px solid black;
  }

  ::slotted(*) {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
`;

let _cleanCSS = new CleanCSS();
let _minified = _cleanCSS.minify(_css).styles;

// ==========================
// exports
// ==========================

class PanelGroup extends window.HTMLElement {
  constructor () {
    super();

    this._inited = false;
    this._dockable();

    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <ui-dock-tabbar id="tabbar"></ui-dock-tabbar>
      <div class="border">
        <slot></slot>
      </div>
    `;

    // init style
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = _minified;
    this.shadowRoot.insertBefore( styleElement, this.shadowRoot.firstChild );

    // query element
    this.$tabbar = this.shadowRoot.querySelector('#tabbar');
  }

  connectedCallback () {
    if ( this._inited ) {
      return;
    }

    this._inited = true;
    this.tabIndex = -1;

    // init behaviors
    this._initDockable();

    //
    this._initTabBar();

    // events
    this.$tabbar.addEventListener('tab-changed', this._onTabChanged.bind(this));

    // NOTE: we do this in capture phase to make sure it has the highest priority
    this.addEventListener('keydown', event => {
      // 'command+shift+]' || 'ctrl+tab'
      if (
        (event.shiftKey && event.metaKey && event.keyCode === 221) ||
        (event.ctrlKey && event.keyCode === 9)
      ) {
        event.stopPropagation();

        let next = this.activeIndex+1;
        if ( next >= this.tabCount ) {
          next = 0;
        }

        this.select(next);
        return;
      }

      // 'command+shift+[' || 'ctrl+shift+tab'
      if (
        (event.shiftKey && event.metaKey && event.keyCode === 219) ||
        (event.ctrlKey && event.shiftKey && event.keyCode === 9)
      ) {
        event.stopPropagation();

        let prev = this.activeIndex-1;
        if ( prev < 0 ) {
          prev = this.tabCount-1;
        }

        this.select(prev);
        return;
      }
    }, true);

    // DISABLE: we don't need this since we have capture phase mousedown event
    // BUG: this also prevent us dragging a un-focused tab
    // this.addEventListener('focusin', () => {
    //   FocusMgr._setFocusPanelFrame(this.activeTab.frameEL);
    // });

    // grab mousedown in capture phase to make sure we focus on it
    this.addEventListener('mousedown', event => {
      if ( event.which === 1 ) {
        // TODO
        // FocusMgr._setFocusPanelFrame(this.activeTab.frameEL);
      }
    }, true);

    // if no one process mousedown event, we should blur focused element
    this.addEventListener('mousedown', event => {
      event.stopPropagation();

      if ( event.which === 1 ) {
        // TODO
        // FocusMgr._setFocusElement(null);
      }
    });
  }

  /**
   * @property focusable
   */
  get focusable () {
    return true;
  }

  /**
   * @property focused
   */
  get focused () {
    return this.getAttribute('focused') !== null;
  }

  /**
   * @property activeTab
   */
  get activeTab () {
    return this.$tabbar.activeTab;
  }

  /**
   * @property activeIndex
   */
  get activeIndex () {
    return utils.indexOf(this.$tabbar.activeTab);
  }

  /**
   * @property tabCount
   */
  get tabCount () {
    return this.$tabbar.children.length;
  }

  _getFirstFocusableElement () {
    return this;
  }

  // TODO: ???
  // NOTE: only invoked by FocusMgr
  _setFocused ( focused ) {
    this.$tabbar._setFocused(focused);

    if ( focused ) {
      this.setAttribute('focused', '');
    } else {
      this.removeAttribute('focused');
    }
  }

  _onTabChanged ( event ) {
    event.stopPropagation();

    let detail = event.detail;
    if ( detail.oldTab !== null ) {
      detail.oldTab.frameEL.style.display = 'none';
      detail.oldTab.frameEL.dispatchEvent(new window.CustomEvent('panel-hide', {
        bubbles: false,
      }));
    }

    if ( detail.newTab !== null ) {
      detail.newTab.frameEL.style.display = '';
      detail.newTab.frameEL.dispatchEvent(new window.CustomEvent('panel-show', {
        bubbles: false,
      }));
    }

    utils.saveLayout();
  }

  _initTabBar () {
    //
    let tabbar = this.$tabbar;
    tabbar.panelGroup = this;

    //
    for ( let i = 0; i < this.children.length; ++i ) {
      let frameEL = this.children[i];

      //
      let name = frameEL.getAttribute('name');
      let tabEL = tabbar.addTab(name);
      tabEL.setAttribute('draggable', 'true');

      frameEL.style.display = 'none';
      tabEL.frameEL = frameEL;
      tabEL.setIcon( frameEL.icon );
    }

    tabbar.select(0);
  }

  // override
  _collapseRecursively () {
    this._collapse();
  }

  // override
  _reflowRecursively () {
    // do nothing
  }

  // override
  _updatePreferredSizeRecursively () {
    this._preferredWidth = this.clientWidth;
    this._preferredHeight = this.clientHeight;
  }

  // override
  _finalizePreferredSizeRecursively () {
    this._calcPreferredSizeByFrames();
  }

  // override
  _finalizeMinMaxRecursively () {
    this._calcMinMaxByFrames();
  }

  // override
  _finalizeStyleRecursively () {
    this.style.minWidth = `${this._computedMinWidth}px`;
    this.style.minHeight = `${this._computedMinHeight}px`;
  }

  // override
  _notifyResize () {
    // dispatch 'resize' event for all panel-frame no matter if they are actived
    for ( let i = 0; i < this.children.length; ++i ) {
      let frameEL = this.children[i];
      frameEL.dispatchEvent(new window.CustomEvent('panel-resize', {
        bubbles: false,
      }));
    }
  }

  _calcPreferredSizeByFrames () {
    let tabbarSpace = utils.tabbarSpace;
    let panelSpace = utils.panelSpace;

    // compute width when it is auto
    if ( this._preferredWidth === 'auto' ) {
      let auto = false;
      this._preferredWidth = 0;

      for ( let i = 0; i < this.children.length; ++i ) {
        let frameEL = this.children[i];

        if ( auto || frameEL.width === 'auto' ) {
          auto = true;
          this._preferredWidth = 'auto';
        } else {
          let width = frameEL.width + panelSpace;
          if ( width > this._preferredWidth ) {
            this._preferredWidth = width;
          }
        }
      }
    }

    // compute height when it is auto
    if ( this._preferredHeight === 'auto' ) {
      let auto = false;
      this._preferredHeight = 0;

      for ( let i = 0; i < this.children.length; ++i ) {
        let frameEL = this.children[i];

        if ( auto || frameEL.height === 'auto' ) {
          auto = true;
          this._preferredHeight = 'auto';
        } else {
          let height = frameEL.height + tabbarSpace + panelSpace;
          if ( height > this._preferredHeight ) {
            this._preferredHeight = height;
          }
        }
      }
    }
  }

  _calcMinMaxByFrames () {
    let tabbarSpace = utils.tabbarSpace;
    let panelSpace = utils.panelSpace;

    this._computedMinWidth = 0;
    this._computedMinHeight = 0;

    for ( let i = 0; i < this.children.length; ++i ) {
      let frameEL = this.children[i];

      // min-width
      if ( this._computedMinWidth < frameEL.minWidth ) {
        this._computedMinWidth = frameEL.minWidth;
      }

      // min-height
      if ( this._computedMinHeight < frameEL.minHeight ) {
        this._computedMinHeight = frameEL.minHeight;
      }
    }

    this._computedMinWidth = this._computedMinWidth + panelSpace;
    this._computedMinHeight = this._computedMinHeight + tabbarSpace + panelSpace;
  }

  _collapse () {
    // remove from dock;
    if ( this.$tabbar.children.length === 0 ) {
      if ( this.parentNode.isDockable ) {
        return this.parentNode.removeDock(this);
      }
    }

    return false;
  }

  outOfDate ( idxOrFrameEL ) {
    let tabbar = this.$tabbar;

    if ( typeof idxOrFrameEL === 'number' ) {
      tabbar.outOfDate(idxOrFrameEL);
    } else {
      for ( let i = 0; i < this.children.length; ++i ) {
        if ( idxOrFrameEL === this.children[i] ) {
          tabbar.outOfDate(i);
          break;
        }
      }
    }
  }

  select ( idxOrFrameEL ) {
    let tabbar = this.$tabbar;

    if ( typeof idxOrFrameEL === 'number' ) {
      tabbar.select(idxOrFrameEL);
    } else {
      for ( let i = 0; i < this.children.length; ++i ) {
        if ( idxOrFrameEL === this.children[i] ) {
          tabbar.select(i);
          break;
        }
      }
    }
  }

  insert ( tabEL, frameEL, insertBeforeTabEL ) {
    let tabbar = this.$tabbar;

    tabbar.insertTab(tabEL, insertBeforeTabEL);
    tabEL.setAttribute('draggable', 'true');

    // NOTE: if we just move tabbar, we must not hide frameEL
    if ( tabEL.parentNode !== tabbar ) {
      frameEL.style.display = 'none';
    }
    tabEL.frameEL = frameEL;
    tabEL.setIcon( frameEL.icon );

    //
    if ( insertBeforeTabEL ) {
      if ( frameEL !== insertBeforeTabEL.frameEL ) {
        this.insertBefore(frameEL, insertBeforeTabEL.frameEL);
      }
    } else {
      this.appendChild(frameEL);
    }

    //
    this._calcMinMaxByFrames();

    return utils.indexOf(tabEL);
  }

  add ( frameEL ) {
    let tabbar = this.$tabbar;
    let name = frameEL.name;
    let tabEL = tabbar.addTab(name);

    tabEL.setAttribute('draggable', 'true');

    frameEL.style.display = 'none';
    tabEL.frameEL = frameEL;
    tabEL.setIcon( frameEL.icon );

    this.appendChild(frameEL);

    //
    this._calcMinMaxByFrames();

    //
    return this.children.length - 1;
  }

  closeNoCollapse ( tabEL ) {
    let tabbar = this.$tabbar;

    //
    tabbar.removeTab(tabEL);
    if ( tabEL.frameEL ) {
      let panelGroup = tabEL.frameEL.parentNode;
      panelGroup.removeChild(tabEL.frameEL);
      tabEL.frameEL = null;
    }

    //
    this._calcMinMaxByFrames();
  }

  close ( tabEL ) {
    this.closeNoCollapse(tabEL);
    this._collapse();
  }
}

// addon behaviors
utils.addon(PanelGroup.prototype, dockable);

module.exports = PanelGroup;
