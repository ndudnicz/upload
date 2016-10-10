"use strict";

class Banned {
	constructor() {
	}

	static all() {
		var sqlite3 = require('sqlite3');
		var dbBanned = new sqlite3.Database('db/banned.db');

		dbBanned.all("SELECT * FROM banned;", (err, row) => {
			if (err) {
				console.error(err);
			}
			else if (typeof row !== 'undefined') {
				console.log(row);
			}
		});
	}

	static add(ip) {
		var sqlite3 = require('sqlite3');
		var dbBanned = new sqlite3.Database('db/banned.db');
		var timestamp = new Date().getTime();

		dbBanned.run("INSERT INTO banned VALUES (NULL, ?, ?);", [ip, timestamp], (err) => {
			if (err) {
			}
		});
	}

	static addFromPath(path, res, redir) {
		var sqlite3 = require('sqlite3');
		var dbFiles = new sqlite3.Database('db/uploads.db');
		var dbBanned = new sqlite3.Database('db/banned.db');
		var timestamp = new Date().getTime();

		dbFiles.get("SELECT * FROM uploads WHERE path = ?;", path, (err, row) => {
			if (err || typeof row === 'undefined') {
				return console.error(err);
			}
			else {
				dbBanned.run("INSERT INTO banned VALUES (NULL, ?, ?);", [row.ip, timestamp], (err) => {
					var Files = require('./files.js');
					Files.del(path, res, redir);
					if (err) {
					}
				});
			}
		});
	}
}

module.exports = Banned;
