#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const spawnSync = require('child_process').spawnSync;

const tmpFolder = '/tmp/mmsync';

const deleteFolderRecursive = path => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      const curPath = `${path}/${file}`;

      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const cleanup = () => {
  deleteFolderRecursive(tmpFolder);
};

export function run(settingsFile, opts) {
  const command = opts.rawArgs[1].split('/').pop();
  const mUrlPattern = /"MONGO_URL":\s*"mongodb:\/\/(\S+?):(\S+?)@(\S+?):(\d+)\/(\S+?)[",]/;
  let filestr, result;

  try {
    filestr = fs.readFileSync(settingsFile, { encoding: 'utf-8' });
  } catch (e) {
    if (e.code === 'ENOENT') {
      process.stderr.write(`${command}: ${settingsFile}: No such file\n`);
      process.exit(e.errno);
    }
  }
  const matches = filestr.match(mUrlPattern);

  if (!matches) {
    console.log('bye');
    process.exit(1);
  }

  const username = matches[1];
  const password = matches[2];
  const hostname = matches[3];
  const port = matches[4];
  const dbName = matches[5];

  const dumpOptions = [
    '--host', hostname,
    '--port', port,
    '--username', username,
    '--password', password,
    '--db', dbName,
    '-o', tmpFolder,
  ];

  process.stdout.write(
    `Retrieving data from ${hostname}:${port} (db=${dbName})...`
  );
  result = spawnSync('mongodump', dumpOptions, { encoding: 'utf-8' });

  if (result.status !== 0) {
    // Error
    process.stderr.write('error!\n\n');

    if (result.error && result.error.code === 'ENOENT') {
      process.stderr.write(
        'Are you sure you have the mongodb client tools installed?\n'
      );

      if (os.platform() === 'darwin') {
        process.stderr.write('Try installing mongodb via Homebrew\n');
      }
    } else {
      cleanup();
      console.error(result.stderr);
    }
    process.exit(result.status);
  }

  const importOptions = [
    '--port', '3001',
    '--db', 'meteor',
  ];

  if (opts.drop) {
    importOptions.push('--drop');
  }

  importOptions.push(`${tmpFolder}/${dbName}`);

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
