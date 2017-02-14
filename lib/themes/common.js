'use strict';

module.exports = {
  fit: `
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  `,

  layoutVertical: `
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
  `,

  layoutHorizontal: `
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  `,

  layoutChildren(alignItems, justifyContent) {
    alignItems = alignItems || 'center';
    justifyContent = justifyContent || 'center';

    return `
      align-items: ${alignItems};
      justify-content: ${justifyContent};
    `;
  },
};
