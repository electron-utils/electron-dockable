'use strict';

module.exports = {
  style: `
    :host {
      .layout-vertical();

      padding: 5px;
      box-sizing: border-box;
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
    <h2>Foo</h2>
  `,
};
