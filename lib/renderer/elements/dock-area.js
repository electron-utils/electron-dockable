'use strict';

const CleanCSS = require('clean-css');
const utils = require('../utils');
const dockable = require('../dockable');

// ==========================
// internals
// ==========================

let _css = `
  :host {
    display: block;
    position: relative;
    box-sizing: border-box;
    contain: content;

    overflow: hidden;
  }

  .content {
    /* layout-vertical */
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;

    /* DISABLE: fit (take into account with margin & padding) */
    /* position: relative; */
    /* height: 100%; */
    position: absolute;
    top: 0; bottom: 0; left: 0; right: 0;
  }

  .content:focus {
    outline: none;
  }

  :host([row]) > .content {
    flex-direction: row;
  }
`;

let _cleanCSS = new CleanCSS();
let _minified = _cleanCSS.minify(_css).styles;

// ==========================
// exports
// ==========================

class DockArea extends window.HTMLElement {
  constructor () {
    super();

    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="content">
        <slot></slot>
      </div>
    `;

    // init style
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = _minified;
    this.shadowRoot.insertBefore( styleElement, this.shadowRoot.firstChild );

    // init behaviors
    this._initDockable();

    // init resizer
    this._initResizers();
  }

  /**
   * @property row
   * If true, layout panels horizontally
   */
  get row () {
    return this.hasAttribute('row');
  }
  set row (val) {
    if (val) {
      this.setAttribute('row', '');
    } else {
      this.removeAttribute('row');
    }
  }

  _initResizers () {
    if ( this.children.length > 1 ) {
      for ( let i = 0; i < this.children.length; ++i ) {
        if ( i !== this.children.length-1 ) {
          // var el = this.children[i];
          let nextEL = this.children[i+1];

          let resizer = document.createElement('ui-dock-resizer');
          if ( this.row ) {
            resizer.setAttribute('vertical', '');
          }

          this.insertBefore( resizer, nextEL );
          i += 1;
        }
      }
    }
  }

  _collapseRecursively () {
    // let elements = [];
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._collapseRecursively();
      }
    }

    this._collapse();
  }

  _reflowRecursively () {
    this._reflow();

    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._reflowRecursively();
      }
    }
  }

  _updatePreferredSizeRecursively () {
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._updatePreferredSizeRecursively();
      }
    }

    //
    this._preferredWidth = this.clientWidth;
    this._preferredHeight = this.clientHeight;
  }

  // depth first calculate the width and height
  // finalize size will eventually calculate the size depends on the panel-frame
  _finalizePreferredSizeRecursively () {
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._finalizePreferredSizeRecursively();
      }
    }

    //
    this._finalizePreferredSize();
  }

  // depth first calculate the min max width and height
  // finalize size will eventually calculate the min-max size depends on the panel-frame
  _finalizeMinMaxRecursively () {
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._finalizeMinMaxRecursively();
      }
    }

    //
    this._finalizeMinMax();
  }

  // apply `style.flex` based on computedWidth or computedHeight
  _finalizeStyleRecursively () {
    // NOTE: finalizeStyle is breadth first calculation, because we need to make sure
    //       parent style applied so that the children would not calculate wrong.
    this._finalizeStyle();

    //
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        el._finalizeStyleRecursively();
      }
    }
  }

  _finalizePreferredSize () {
    let resizerSpace = utils.resizerSpace;
    let elements = [];

    // collect dockable elements
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        elements.push(el);
      }
    }

    // compute width when it is auto
    if ( this._preferredWidth === 'auto' ) {
      let auto = false;

      if ( this.row ) {
        // preserve resizers' width
        this._preferredWidth = elements.length > 0 ? resizerSpace * (elements.length-1) : 0;

        for ( let i = 0; i < elements.length; ++i ) {
          let el = elements[i];

          if ( auto || el._preferredWidth === 'auto' ) {
            auto = true;
            this._preferredWidth = 'auto';
          } else {
            this._preferredWidth += el._preferredWidth;
          }
        }
      } else {
        this._preferredWidth = 0;

        for ( let i = 0; i < elements.length; ++i ) {
          let el = elements[i];

          if ( auto || el._preferredWidth === 'auto' ) {
            auto = true;
            this._preferredWidth = 'auto';
          } else {
            if ( el._preferredWidth > this._preferredWidth ) {
              this._preferredWidth = el._preferredWidth;
            }
          }
        }
      }
    }

    // compute height when it is auto
    if ( this._preferredHeight === 'auto' ) {
      let auto = false;

      if ( this.row ) {
        this._preferredHeight = 0;

        for ( let i = 0; i < elements.length; ++i ) {
          let el = elements[i];

          if ( auto || el._preferredHeight === 'auto' ) {
            auto = true;
            this._preferredHeight = 'auto';
          } else {
            if ( el._preferredHeight > this._preferredHeight ) {
              this._preferredHeight = el._preferredHeight;
            }
          }
        }
      } else {
        // preserve resizers' height
        this._preferredHeight = elements.length > 0 ? resizerSpace * (elements.length-1) : 0;

        for ( let i = 0; i < elements.length; ++i ) {
          let el = elements[i];

          if ( auto || el._preferredHeight === 'auto' ) {
            auto = true;
            this._preferredHeight = 'auto';
          } else {
            this._preferredHeight += el._preferredHeight;
          }
        }
      }
    }
  }

  // init and finalize min,max depends on children
  _finalizeMinMax () {
    let resizerSpace = utils.resizerSpace;
    let elements = [];

    // collect dockable elements
    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];

      if ( el._dockable ) {
        elements.push(el);
      }
    }

    // compute min max from dockable elements
    if ( this.row ) {
      // preserve resizers' width
      this._computedMinWidth = elements.length > 0 ? resizerSpace * (elements.length-1) : 0; // preserve resizers' width
      this._computedMinHeight = 0;

      for ( let i = 0; i < elements.length; ++i ) {
        let el = elements[i];

        // min-width
        this._computedMinWidth += el._computedMinWidth;

        // min-height
        if ( this._computedMinHeight < el._computedMinHeight ) {
          this._computedMinHeight = el._computedMinHeight;
        }
      }
    } else {
      // preserve resizers' height
      this._computedMinWidth = 0;
      this._computedMinHeight = elements.length > 0 ? resizerSpace * (elements.length-1) : 0;

      for ( let i = 0; i < elements.length; ++i ) {
        let el = elements[i];

        // min-width
        if ( this._computedMinWidth < el._computedMinWidth ) {
          this._computedMinWidth = el._computedMinWidth;
        }

        // min-height
        this._computedMinHeight += el._computedMinHeight;
      }
    }
  }

  _finalizeStyle () {
    // min-width
    this.style.minWidth = `${this._computedMinWidth}px`;

    // min-height
    this.style.minHeight = `${this._computedMinHeight}px`;

    // let resizerCnt = (this.children.length - 1)/2;
    // let resizerSize = resizerCnt * resizerSpace;
    // let hasAutoLayout = false;

    if ( this.children.length === 1 ) {
      let el = this.children[0];

      // hasAutoLayout = true;
      el.style.flex = '1 1 auto';
    } else {
      for ( let i = 0; i < this.children.length; ++i ) {
        let el = this.children[i];

        if ( el._dockable ) {
          let size = this.row ? el._preferredWidth : el._preferredHeight;

          if ( size === 'auto' ) {
            // hasAutoLayout = true;
            el.style.flex = '1 1 auto';
          } else {
            // // if this is last el and we don't have auto-layout elements, give rest size to last el
            // if ( i === (this.children.length-1) && !hasAutoLayout ) {
            //   el.style.flex = '1 1 auto';
            // }
            // else {
            //   el.style.flex = `0 0 ${size}px`;
            // }
            el.style.flex = `0 0 ${size}px`;
          }
        }
      }
    }
  }

  _reflow () {
    let len = this.children.length;
    let sizeList = new Array(len);
    let totalSize = 0;

    //
    for ( let i = 0; i < len; ++i ) {
      let el = this.children[i];
      let size = this.row ? el.offsetWidth : el.offsetHeight;

      sizeList[i] = size;

      // NOTE: we only need totalSize for dockable element,
      // this will make sure the ratio will be calculated correctly.
      if ( el._dockable ) {
        totalSize += size;
      }
    }

    for ( let i = 0; i < this.children.length; ++i ) {
      let el = this.children[i];
      if ( el._dockable ) {
        let ratio = sizeList[i]/totalSize;
        el.style.flex = `${ratio} ${ratio} 0px`;

        // DISABLE: we use 0px instead.
        // The `${sizeList[i]}px` will force the dockable element use the given size,
        // when the parent size is less than the preferred size, the panel will exceed.
        // el.style.flex = `${ratio} ${ratio} ${sizeList[i]}px`;
      }
    }
  }
}

// addon behaviors
utils.addon(DockArea.prototype, dockable);

module.exports = DockArea;
