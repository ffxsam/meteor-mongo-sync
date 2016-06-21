# Meteor/Mongo Sync

## Description
This is a simple command line tool to import Mongo data from a remote server into a local Meteor/Mongo dev environment. It's useful for copying data from staging or production down so you can attempt to replicate bugs using real data.

## Installation

    npm install -g meteor-mongo-sync

## Usage

    mmsync [options] <settings JSON file>

### Options

```
-d, --drop = drop local database before importing
```

MMSync will read the `MONGO_URL` env var from your `settings.json` file and use that to import data from.

## Future Plans
It would be cool to have an ncurses type interface ([`blessed`](https://www.npmjs.com/package/blessed) maybe?) to show a list of collections that a user could checkmark to include/exclude from the import.