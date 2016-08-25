#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.run = run;


var fs = require('fs');
var os = require('os');
var spawnSync = require('child_process').spawnSync;

var tmpFolder = '/tmp/mmsync';

var deleteFolderRecursive = function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + '/' + file;

      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

var cleanup = function cleanup() {
  deleteFolderRecursive(tmpFolder);
};

function run(settingsFile, opts) {
  var command = opts.rawArgs[1].split('/').pop();
  var mUrlPattern = /"MONGO_URL":\s*"mongodb:\/\/(\S+?):(\S+?)@(\S+?):(\d+)\/(\S+?)[",]/;
  var filestr = void 0,
      result = void 0;

  try {
    filestr = fs.readFileSync(settingsFile, { encoding: 'utf-8' });
  } catch (e) {
    if (e.code === 'ENOENT') {
      process.stderr.write(command + ': ' + settingsFile + ': No such file\n');
      process.exit(e.errno);
    }
  }
  var matches = filestr.match(mUrlPattern);

  if (!matches) {
    console.log('bye');
    process.exit(1);
  }

  var username = matches[1];
  var password = matches[2];
  var hostname = matches[3];
  var port = matches[4];
  var dbName = matches[5];

  var dumpOptions = ['--host', hostname, '--port', port, '--username', username, '--password', password, '--db', dbName, '-o', tmpFolder];

  process.stdout.write('Retrieving data from ' + hostname + ':' + port + ' (db=' + dbName + ')...');
  result = spawnSync('mongodump', dumpOptions, { encoding: 'utf-8' });

  if (result.status !== 0) {
    // Error
    process.stderr.write('error!\n\n');

    if (result.error && result.error.code === 'ENOENT') {
      process.stderr.write('Are you sure you have the mongodb client tools installed?\n');

      if (os.platform() === 'darwin') {
        process.stderr.write('Try installing mongodb via Homebrew\n');
      }
    } else {
      cleanup();
      console.error(result.stderr);
    }
    process.exit(result.status);
  }

  var importOptions = ['--port', '3001', '--db', 'meteor'];

  if (opts.drop) {
    importOptions.push('--drop');
  }

  importOptions.push(tmpFolder + '/' + dbName);

  process.stdout.write('OK!\nImporting into local Meteor DB...');
  result = spawnSync('mongorestore', importOptions, { encoding: 'utf-8' });

  if (result.status !== 0) {
    process.stderr.write('error!\n\n');
    cleanup();
    console.error(result.stderr);
    process.exit(result.status);
  }

  process.stdout.write('OK!\n\nDone!\n');
  cleanup();
}