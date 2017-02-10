'use strict';

const {app, BrowserWindow} = require('electron');
const protocols = require('electron-protocols');
const dockable = require('../../index');
let win;

protocols.register('app', protocols.basepath(app.getAppPath()));

app.on('ready', function () {
  // TODO
  // dockable.config({
  //   ...
  // });
  // dockable.run();

  // win = new BrowserWindow({
  //   center: true,
  //   width: 400,
  //   height: 600,
  // });
  // win.loadURL('file://' + __dirname + '/index.html');
});
