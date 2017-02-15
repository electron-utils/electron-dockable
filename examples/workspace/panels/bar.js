'use strict';

module.exports = {
  style: `
    :host {
      .layout-vertical();

      margin: 5px;
      box-sizing: border-box;
      background: #333;
      color: #888;
    }

    h2 {
      color: #f90;
      text-align: center;
    }

    #logs {
      overflow: auto;
    }
  `,

  template: `
    <h2>Bar</h2>
  `,
};
