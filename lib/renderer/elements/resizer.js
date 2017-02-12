'use strict';

// requires
const platform = require('electron-platform');
const CleanCSS = require('clean-css');
const utils = require('../utils');

// ==========================
// internals
// ==========================

let _css = `
  :host {
    position: relative;
    contain: content;

    flex: none;
    white-space: nowrap;

    z-index: 2;

    /* horizontal resizer */
    margin-top: -4px;     /*blank-size*/
    margin-bottom: -4px;  /*blank-size*/
    margin-left: 0px;
    margin-right: 0px;
    width: auto;
    height: 11px;         /*size*/
  }

  .bar {
    position: absolute;
    top: 4px;
    left: 0px;
    height: 3px;
    width: 100%;
  }

  :host([active]) > .bar {
    background-color: #09f;
  }

  :host([vertical]) {
    margin-top: 0px;
    margin-bottom: 0px;
    margin-left: -4px;  /*blank-size*/
    margin-right: -4px; /*blank-size*/
    width: 11px;        /*size*/
    height: auto;
  }

  :host([vertical]) > .bar {
    position: absolute;
    top: 0px;
    left: 4px;
    width: 3px;
    height: 100%;
  }

  :host(:hover) {
    cursor: row-resize;
  }

  :host(:hover) > .bar {
    cursor: row-resize;
  }

  :host([vertical]:hover) {
    cursor: col-resize;
  }

  :host([vertical]:hover) > .bar {
    cursor: col-resize;
  }

  :host(.platform-win:hover) {
    cursor: ns-resize;
  }

  :host(.platform-win:hover) > .bar {
    cursor: ns-resize;
  }

  :host(.platform-win[vertical]:hover) {
    cursor: ew-resize;
  }

  :host(.platform-win[vertical]:hover) > .bar {
    cursor: ew-resize;
  }
`;

let _cleanCSS = new CleanCSS();
let _minified = _cleanCSS.minify(_css).styles;

let _dragGhost = null;

function _addDragGhost ( cursor ) {
  // add drag-ghost
  if ( _dragGhost === null ) {
    _dragGhost = document.createElement('div');
    _dragGhost.classList.add('drag-ghost');
    _dragGhost.style.position = 'absolute';
    _dragGhost.style.zIndex = '999';
    _dragGhost.style.top = '0';
    _dragGhost.style.right = '0';
    _dragGhost.style.bottom = '0';
    _dragGhost.style.left = '0';
    _dragGhost.oncontextmenu = function () { return false; };
  }
  _dragGhost.style.cursor = cursor;
  document.body.appendChild(_dragGhost);

  return _dragGhost;
}

function _removeDragGhost () {
  if ( _dragGhost !== null ) {
    _dragGhost.style.cursor = 'auto';
    _dragGhost.remove();
  }
}

function _calcWidth ( el, width ) {
  if ( width < el._computedMinWidth ) {
    return el._computedMinWidth;
  }

  if (
    el._computedMaxWidth !== undefined &&
    el._computedMaxWidth !== 'auto' &&
    width > el._computedMaxWidth
  ) {
    return el._computedMaxWidth;
  }

  return width;
}

function _calcHeight ( el, height ) {
  if ( height < el._computedMinHeight ) {
    return el._computedMinHeight;
  }

  if (
    el._computedMaxHeight !== undefined &&
    el._computedMaxHeight !== 'auto' &&
    height > el._computedMaxHeight
  ) {
    return el._computedMaxHeight;
  }

  return height;
}

function _resize (
  elementList, vertical, offset,
  sizeList, resizerIndex,
  prevTotalSize, prevMinSize, prevMaxSize,
  nextTotalSize, nextMinSize, nextMaxSize
) {
  _unused(prevMaxSize);
  _unused(nextMaxSize);

  let expectSize, newPrevSize, newNextSize;
  let prevOffset, nextOffset;
  let prevIndex, nextIndex;
  let dir = Math.sign(offset);

  if ( dir > 0 ) {
    prevIndex = resizerIndex - 1;
    nextIndex = resizerIndex + 1;
  } else {
    prevIndex = resizerIndex + 1;
    nextIndex = resizerIndex - 1;
  }

  prevOffset = offset;

  // prev
  let prevEL = elementList[prevIndex];
  let prevSize = sizeList[prevIndex];

  expectSize = prevSize + prevOffset * dir;
  if ( vertical ) {
    newPrevSize = _calcWidth(prevEL, expectSize);
  } else {
    newPrevSize = _calcHeight(prevEL, expectSize);
  }

  prevOffset = (newPrevSize - prevSize) * dir;

  // next
  let nextEL = elementList[nextIndex];
  let nextSize = sizeList[nextIndex];

  while (1) {
    expectSize = nextSize - prevOffset * dir;
    if ( vertical ) {
      newNextSize = _calcWidth(nextEL, expectSize);
    } else {
      newNextSize = _calcHeight(nextEL, expectSize);
    }

    nextOffset = (newNextSize - nextSize) * dir;

    nextEL.style.flex = `0 0 ${newNextSize}px`;

    if ( newNextSize - expectSize === 0 ) {
      break;
    }

    //
    prevOffset += nextOffset;

    //
    if ( dir > 0 ) {
      nextIndex += 2;

      if ( nextIndex >= elementList.length ) {
        break;
      }
    } else {
      nextIndex -= 2;

      if ( nextIndex < 0 ) {
        break;
      }
    }

    nextEL = elementList[nextIndex];
    nextSize = sizeList[nextIndex];
  }

  // re-calculate newPrevSize
  if ( dir > 0 ) {
    if ( nextTotalSize - offset * dir <= nextMinSize ) {
      prevOffset = (nextTotalSize - nextMinSize) * dir;
      newPrevSize = prevSize + prevOffset * dir;
    }
  } else {
    if ( prevTotalSize - offset * dir <= prevMinSize ) {
      prevOffset = (prevTotalSize - prevMinSize) * dir;
      newPrevSize = prevSize + prevOffset * dir;
    }
  }

  //
  prevEL.style.flex = `0 0 ${newPrevSize}px`;

  for ( let i = 0; i < elementList.length; ++i ) {
    let el = elementList[i];
    if ( utils.isDockResizer(el) ) {
      continue;
    }

    if ( el._notifyResize ) {
      el._notifyResize();
    }
  }
}

function _unused () {}

// ==========================
// exports
// ==========================

class DockResizer extends window.HTMLElement {
  createdCallback () {
    this.attachShadow({
      mode: 'open'
    });
    this.shadowRoot.innerHTML = `
      <div class="bar"></div>
    `;

    // init style
    let styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = _minified;
    this.shadowRoot.insertBefore( styleElement, this.shadowRoot.firstChild );

    //
    if ( platform.isWin32 ) {
      this.classList.add('platform-win');
    }

    //
    this.addEventListener('mousedown', this._onMouseDown.bind(this));
  }

  /**
   * @property vertical
   */
  get vertical () {
    return this.hasAttribute('vertical');
  }
  set vertical (val) {
    if (val) {
      this.setAttribute('vertical', '');
    } else {
      this.removeAttribute('vertical');
    }
  }

  /**
   * @property active
   */
  get active () {
    return this.getAttribute('active') !== null;
  }
  set active (val) {
    if (val) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  _snapshot () {
    let parentEL = this.parentNode;

    let sizeList = [];
    let resizerIndex = -1;
    // var totalSize = -1;

    // DISABLE
    // get parent size
    // let rect = parentEL.getBoundingClientRect();

    // get element size
    for ( let i = 0; i < parentEL.children.length; ++i ) {
      let el = parentEL.children[i];
      if ( el === this ) {
        resizerIndex = i;
      }

      // DISABLE:
      // rect = el.getBoundingClientRect();
      // sizeList.push( Math.round(this.vertical ? rect.width : rect.height) );
      sizeList.push( this.vertical ? el.offsetWidth : el.offsetHeight );
    }

    //
    let prevTotalSize = 0;
    let prevMinSize = 0;
    let prevMaxSize = 0;
    let nextTotalSize = 0;
    let nextMinSize = 0;
    let nextMaxSize = 0;

    for ( let i = 0; i < resizerIndex; i += 2 ) {
      prevTotalSize += sizeList[i];
      prevMinSize += this.vertical ?
        parentEL.children[i]._computedMinWidth :
        parentEL.children[i]._computedMinHeight
        ;

      prevMaxSize += this.vertical ?
        parentEL.children[i]._computedMaxWidth :
        parentEL.children[i]._computedMaxHeight
        ;
    }

    for ( let i = resizerIndex+1; i < parentEL.children.length; i += 2 ) {
      nextTotalSize += sizeList[i];
      nextMinSize += this.vertical ?
        parentEL.children[i]._computedMinWidth :
        parentEL.children[i]._computedMinHeight
        ;

      nextMaxSize += this.vertical ?
        parentEL.children[i]._computedMaxWidth :
        parentEL.children[i]._computedMaxHeight
        ;
    }

    return {
      sizeList: sizeList,
      resizerIndex: resizerIndex,
      prevTotalSize: prevTotalSize,
      prevMinSize: prevMinSize,
      prevMaxSize: prevMaxSize,
      nextTotalSize: nextTotalSize,
      nextMinSize: nextMinSize,
      nextMaxSize: nextMaxSize,
    };
  }

  _onMouseDown ( event ) {
    event.stopPropagation();

    //
    let parentEL = this.parentNode;

    //
    this.active = true;
    let snapshot = this._snapshot();
    let lastDir = 0;
    let rect = this.getBoundingClientRect();
    let centerx = Math.round(rect.left + rect.width/2);
    let centery = Math.round(rect.top + rect.height/2);

    for ( let i = 0; i < parentEL.children.length; ++i ) {
      let el = parentEL.children[i];
      if ( utils.isDockResizer(el) ) {
        continue;
      }

      el.style.flex = `0 0 ${snapshot.sizeList[i]}px`;
    }

    // mousemove
    let mousemoveHandle = (event) => {
      event.stopPropagation();

      // get offset
      let offset;
      if ( this.vertical ) {
        offset = event.clientX - centerx;
      } else {
        offset = event.clientY - centery;
      }

      //
      if ( offset !== 0 ) {
        let rect = this.getBoundingClientRect();
        let curx = Math.round(rect.left + rect.width/2);
        let cury = Math.round(rect.top + rect.height/2);
        let delta;

        if ( this.vertical ) {
          delta = event.clientX - curx;
        } else {
          delta = event.clientY - cury;
        }

        let curDir = Math.sign(delta);

        if ( lastDir !== 0 && lastDir !== curDir ) {
          snapshot = this._snapshot();
          centerx = curx;
          centery = cury;
          offset = delta;
        }

        lastDir = curDir;

        _resize(
          parentEL.children,
          this.vertical,
          offset,
          snapshot.sizeList,
          snapshot.resizerIndex,
          snapshot.prevTotalSize,
          snapshot.prevMinSize,
          snapshot.prevMaxSize,
          snapshot.nextTotalSize,
          snapshot.nextMinSize,
          snapshot.nextMaxSize
        );
      }
    };

    // mouseup
    let mouseupHandle = (event) => {
      event.stopPropagation();

      document.removeEventListener('mousemove', mousemoveHandle);
      document.removeEventListener('mouseup', mouseupHandle);
      _removeDragGhost();

      this.active = false;

      let parentEL = this.parentNode;

      // reflow parent
      if ( parentEL._reflowRecursively ) {
        parentEL._reflowRecursively();
      }

      // update preferred size
      if ( parentEL._updatePreferredSizeRecursively ) {
        parentEL._updatePreferredSizeRecursively();
      }

      // notify resize
      for ( let i = 0; i < parentEL.children.length; ++i ) {
        let el = parentEL.children[i];

        if ( utils.isDockResizer(el) ) {
          continue;
        }

        if ( el._notifyResize ) {
          el._notifyResize();
        }
      }

      //
      utils.saveLayout();
      // TODO: FocusMgr._refocus();
    };

    // add drag-ghost
    if ( platform.isWin32 ) {
      _addDragGhost( this.vertical ? 'ew-resize' : 'ns-resize' );
    } else {
      _addDragGhost( this.vertical ? 'col-resize' : 'row-resize' );
    }

    document.addEventListener ( 'mousemove', mousemoveHandle );
    document.addEventListener ( 'mouseup', mouseupHandle );
  }
}

module.exports = DockResizer;
