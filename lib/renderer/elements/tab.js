'use strict';

const CleanCSS = require('clean-css');
const utils = require('../utils');

// ==========================
// internals
// ==========================

let _css = `
  :host {
    position: relative;

    /* layout-horizontal */
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;

    box-sizing: border-box;
    /* contain: content; CAN NOT USE THIS */

    font-size: 14px;

    margin-left: -1px;
    margin-top: -1px;
    margin-bottom: 1px;
    padding-top: 1px;

    color: #666;
    background: #aaa;

    border-top: 1px solid black;
    border-left: 1px solid black;
    border-right: 1px solid black;
  }

  .title {
    /* layout-horizontal */
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;

    /* layout-children(center, flex-start) */
    align-items: center;
    justify-content: flex-start;

    margin: 0px 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :host(.active) {
    background: #fff;

    margin-left: -1px;
    margin-top: -1px;
    margin-bottom: 0px;
    padding-top: 0px;

    color: #006ce2;
    // color: #333;
    background: #eee;
  }

  :host(.active[focused]) {
  }

  :host([out-of-date]),
  :host(.active[out-of-date]) {
  }

  :host(.active[focused][out-of-date]) {
  }
`;

let _cleanCSS = new CleanCSS();
let _minified = _cleanCSS.minify(_css).styles;

// ==========================
// exports
// ==========================

class Tab extends window.HTMLElement {
  constructor () {
    super();

    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="title">
        <div id="icon"></div>
        <span id="name"></span>
      </div>
    `;

    // init style
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = _minified;
    this.shadowRoot.insertBefore( styleElement, this.shadowRoot.firstChild );

    // events
    this.addEventListener( 'dragstart', this._onDragStart.bind(this) );
    this.addEventListener( 'dragend', this._onDragEnd.bind(this) );

    this.addEventListener( 'mousedown', event => { event.stopPropagation(); } );
    this.addEventListener( 'click', this._onClick.bind(this) );

    // selectors
    this.$name = this.shadowRoot.querySelector('#name');
    this.$icon = this.shadowRoot.querySelector('#icon');
    this.frameEL = null;

    this.setIcon(null);
  }

  get name () {
    return this.$name.innerText;
  }
  set name (val) {
    this.$name.innerText = val;
  }

  get outOfDate () {
    return this.getAttribute('out-of-date') !== null;
  }
  set outOfDate (val) {
    if (val) {
      this.setAttribute('out-of-date', '');
    } else {
      this.removeAttribute('out-of-date');
    }
  }

  get focused () {
    return this.getAttribute('focused') !== null;
  }
  set focused (val) {
    if (val) {
      this.setAttribute('focused', '');
    } else {
      this.removeAttribute('focused');
    }
  }

  _onDragStart ( event ) {
    event.stopPropagation();

    utils.dragstart( event, this );
  }

  _onDragEnd ( event ) {
    event.stopPropagation();

    utils.dragend();
  }

  _onClick ( event ) {
    event.stopPropagation();

    this.dispatchEvent(new window.CustomEvent('tab-click', {
      bubbles: true
    }));
  }

  // NOTE: there is a bug on css:hover for tab,
  // when we drop tab 'foo' on top of tab 'bar' to insert before it,
  // the tab 'bar' will keep css:hover state after.
  // _onMouseEnter: function ( event ) {
  //     this.classList.add('hover');
  // },

  // _onMouseLeave: function ( event ) {
  //     this.classList.remove('hover');
  // },

  setIcon ( img ) {
    let iconEL = this.$icon;

    if ( img ) {
      iconEL.style.display = 'inline';
      if ( iconEL.children.length ) {
        iconEL.removeChild(iconEL.firstChild);
      }
      iconEL.appendChild(img);
      // NOTE: this will prevent icon been dragged
      img.setAttribute( 'draggable', 'false' );

      return;
    }

    iconEL.style.display = 'none';
    if ( iconEL.children.length ) {
      iconEL.removeChild(iconEL.firstChild);
    }
  }
}

module.exports = Tab;
