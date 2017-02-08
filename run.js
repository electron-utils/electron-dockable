'use strict';

const electron = require('electron');
const {spawn} = require('child_process');
const fs = require('fs');

let processArgv, appPath;

if ( process.argv.length === 3 ) {
  appPath = process.argv[2];
  processArgv = process.argv.slice(3);
}

if ( !fs.existsSync(appPath) ) {
  console.error(`Can not find app path ${appPath}`);
  return;
}

let args = [appPath].concat(processArgv);

let app = spawn(electron, args, {
  stdio: 'inherit'
});

app.on('close', () => {
  // User closed the app. Kill the host process.
  process.exit();
});
