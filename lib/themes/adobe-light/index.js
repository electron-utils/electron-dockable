'use strict';

const common = require('../common');

module.exports = {
  'ui-panel-group': {
    html: `
      <ui-dock-tabbar id="tabbar"></ui-dock-tabbar>
      <div class="border">
        <div class="inner">
          <slot></slot>
        </div>
      </div>
    `,
    css: `
      :host {
        ${common.layoutVertical}

        position: relative;
        box-sizing: border-box;
        contain: content;

        cursor: default;
      }

      :host(:focus) {
        outline: none;
      }

      .border {
        flex: 1;

        position: relative;
        border: 1px solid black;
      }

      .inner {
        ${common.fit}

        border-top: 1px solid rgba(255, 255, 255, 0.2);
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);

        background-color: #bbb;
      }
    `,
  },

  'ui-tabbar': {
    html: `
      <div class="inner">
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
      </div>
    `,

    css: `
      :host {
        position: relative;
        display: inline-block;
        /* contain: content; CAN NOT USE THIS */

        box-sizing: border-box;
        font-size: 16px;

        border-left: 1px solid black;
        border-right: 1px solid black;
        border-top: 1px solid black;

        border-top-left-radius: 3px;
        border-top-right-radius: 3px;

        color: #212121;
        background-color: #555;
        z-index: 1;
      }

      .inner {
        ${common.layoutHorizontal}
        ${common.layoutChildren('center', 'center')}

        border-top: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        border-right: 1px solid rgba(255, 255, 255, 0.08);

        border-top-left-radius: 3px;
        border-top-right-radius: 3px;

        padding-right: 5px;
      }

      .tabs {
        ${common.layoutHorizontal}

        flex: 1;

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
    `,
  },

  'ui-tab': {
    html: `
      <div class="border">
        <div class="inner">
          <div class="title">
            <div id="icon"></div>
            <span id="name"></span>
          </div>
        </div>
      </div>
    `,

    css: `
      :host {
        ${common.layoutHorizontal}
        box-sizing: border-box;
        /* contain: content; CAN NOT USE THIS */

        height: @tabbar_height - 2;
        font-size: @tab_font_size;
        margin-right: -1px;

        color: @tab_text_color;
      }

      .border {
        border-top: 1px solid @panel_border_color;
        border-left: 1px solid @panel_border_color;
        border-right: 1px solid @panel_border_color;
      }

      .inner {
        display: inline-block;
        box-sizing: border-box;

        height: @tabbar_height - 3;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        border-right: 1px solid rgba(255, 255, 255, 0.08);

        background-color: @tab_bg_deactive;
      }

      /* :host(.hover) .inner {     */
      /*     background-color: #555; */
      /* }                           */
      /* NOTE: there is a bug on css:hover for tab,                      */
      /* when we drop tab 'foo' on top of tab 'bar' to insert before it, */
      /* the tab 'bar' will keep css:hover state after.                  */
      .inner:hover {
        background-color: @tab_bg_active + 10%;
      }

      .title {
        .layout-horizontal();
        .layout-children(center, flex-start);

        min-width: @tab_min_width;
        height: @tabbar_height - 2; // NOTE: do not use 100%, cause when tab is unselect, the title height is different

        margin: 0px 10px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #icon {
        display: inline-block;
        margin-right: 5px;
      }

      #icon img {
        width: @tab_icon_size;
        height: @tab_icon_size;
      }

      :host(.active) {
        height: @tabbar_height;
        margin-top: -1px;
        border-top: 1px solid @panel_border_color;

        .inner {
          height: @tabbar_height - 1;
          background-color: @tab_bg_active;
        }
      }

      :host(.active[focused]) {
        color: @tab_text_color + 80%;

        .inner {
          border-top: 1px solid @panel_border_color_focus;
          border-left: 1px solid @panel_border_color_focus;
          border-right: 1px solid @panel_border_color_focus;
          background-color: @tab_bg_focus;
        }
      }

      :host([out-of-date]) .inner,
      :host(.active[out-of-date]) .inner {
        background-color: @tab_bg_dirty;
      }

      :host(.active[focused][out-of-date]) {
        .inner {
          border-top: 1px solid @tab_bg_dirty + 50%;
          border-left: 1px solid @tab_bg_dirty + 50%;;
          border-right: 1px solid @tab_bg_dirty + 50%;;
        }
      }
    `,
  },
};
