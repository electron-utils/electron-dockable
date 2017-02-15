'use strict';

const {app, BrowserWindow} = require('electron');
const protocols = require('electron-protocols');
const dockable = require('../../index');
let win;

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
                { id: 'bar-02', src: 'app://panels/bar.js'}
              ],
            },
            {
              type: 'panel-group',
              width: 100,
              active: 0,
              children: [
                { id: 'bar', src: 'app://panels/bar.js'},
              ],
            },
          ],
        },
      ]
    }
  });

  // TODO:
  // dockable.run();

  win = new BrowserWindow({
    center: true,
    width: 400,
    height: 600,
  });
  win.loadURL('file://' + __dirname + '/index.html');
});
