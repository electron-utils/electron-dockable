'use strict';

const {app} = require('electron');
const protocols = require('electron-protocols');
const dockable = require('../../index');

protocols.register('app', protocols.basepath(app.getAppPath()));

app.on('ready', function () {
  dockable.init({
    layout: {
      type: 'dock-area-v',
      children: [
        {
          type: 'panel-group',
          height: 300,
          active: 0,
          children: [
            { id: 'asset', src: 'app://panels/foo.js'}
          ],
        },
        {
          type: 'dock-area-h',
          children: [
            {
              type: 'panel-group',
              active: 1,
              children: [
                { id: 'bar', src: 'app://panels/bar.js'},
                { id: 'alpha', src: 'app://panels/alpha.js'}
              ],
            },
            {
              type: 'panel-group',
              active: 0,
              children: [
                { id: 'bar-02', src: 'app://panels/bar.js'},
              ],
            },
          ],
        },
      ]
    }
  });

  //
  dockable.windows.restore(`file://${__dirname}/index.html`, {
    center: true,
    width: 400,
    height: 600,
  });
});
