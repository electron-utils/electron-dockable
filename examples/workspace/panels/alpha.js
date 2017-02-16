'use strict';

module.exports = {
  style: `
    :host {
      .layout-vertical();

      margin: 1px;
      box-sizing: border-box;
      background: #aaa;
    }

    h2 {
      color: #000;
      text-align: center;
    }

    #logs {
      overflow: auto;
    }
  `,

  template: `
    <h2>Alpha</h2>
  `,
};
