'use strict';

const utils = require('../utils');

// ==========================
// exports
// ==========================

class Tab extends window.HTMLElement {
  createdCallback () {
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="border">
        <div class="inner">
          <div class="title">
            <div id="icon"></div>
            <span id="name"></span>
          </div>
        </div>
      </div>
    `;

    // TODO
    // this.shadowRoot.insertBefore(
    //   DomUtils.createStyleElement('theme://elements/tab.css'),
    //   root.firstChild
    // );

    this.addEventListener( 'dragstart', this._onDragStart.bind(this) );
    this.addEventListener( 'dragend', this._onDragEnd.bind(this) );

    this.addEventListener( 'mousedown', event => { event.stopPropagation(); } );
    this.addEventListener( 'click', this._onClick.bind(this) );

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
