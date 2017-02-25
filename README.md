# electron-dockable

[![Linux Build Status](https://travis-ci.org/electron-utils/electron-dockable.svg?branch=master)](https://travis-ci.org/electron-utils/electron-dockable)
[![Windows Build status](https://ci.appveyor.com/api/projects/status/gvq9d5i4hw07hulm?svg=true)](https://ci.appveyor.com/project/jwu/electron-dockable)
[![Dependency Status](https://david-dm.org/electron-utils/electron-dockable.svg)](https://david-dm.org/electron-utils/electron-dockable)
[![devDependency Status](https://david-dm.org/electron-utils/electron-dockable/dev-status.svg)](https://david-dm.org/electron-utils/electron-dockable#info=devDependencies)

**Work in progress...**

  - [x] dock and undock in single page workspace
  - [ ] pop out and dock in a panel
  - [x] save and restore dock layout
  - [ ] ui-dock-toolbar
  - [ ] ui-dock-panel (single panel, no tab-bar)
  - [ ] floating panel in workspace (always on top, set as child window in BrowserWindow)
  - [ ] provide a way to customize theme
  - [ ] provide a way to customize dock behaviors
  - [ ] unit tests
  - [ ] ...

Dockable ui framework for Electron. Use the [Custom Element v1](https://developers.google.com/web/fundamentals/getting-started/primers/customelements) & [Shadow DOM v1](https://developers.google.com/web/fundamentals/getting-started/primers/shadowdom).

## Install

```bash
npm install --save electron-dockable
```

## Run Examples

```bash
npm start ./examples/${name}
```

## Usage

**main process**

Please check [electron-panel](https://github.com/electron-utils/electron-panel) to learn how to define a panel-frame.

```javascript
'use strict';

const {app} = require('electron');
const protocols = require('electron-protocols');
const dockable = require('electron-dockable');

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
            { id: 'asset', src: 'app://panels/foo.js' } // a panel-frame defined by you
          ],
        },
        {
          type: 'dock-area-h',
          children: [
            {
              type: 'panel-group',
              active: 1,
              children: [
                { id: 'bar', src: 'app://panels/bar.js' } // a panel-frame defined by you
              ],
            },
            {
              type: 'panel-group',
              active: 0,
              children: [
                { id: 'bar-02', src: 'app://panels/bar.js' } // a panel-frame defined by you
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
```

**renderer process**

```html
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Workspace</title>
    <style>
      body {
        position: absolute;
        top: 0; bottom: 0; left: 0; right: 0;
        display: flex;
        flex-direction: column;
      }
    </style>
  </head>

  <body>
    <ui-workspace style="flex: 1;"></ui-workspace>

    <script>
      require('electron-dockable');
    </script>
  </body>
</html>
```

## Documentation

TODO

## License

MIT © 2017 Johnny Wu
