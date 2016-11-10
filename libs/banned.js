"use strict";

class Banned {
	constructor() {
	}

	static all() {
		const sqlite3 = require('sqlite3')
				,dbBanned = new sqlite3.Database('db/banned.db');

		dbBanned.all("SELECT * FROM banned;", (err, row) => {
			if (err)
				console.error(err);
			else if (typeof row !== 'undefined')
				console.log(row);
		});
	}

	static add(ip) {
		const sqlite3 = require('sqlite3')
				,dbBanned = new sqlite3.Database('db/banned.db');

		let timestamp = new Date().getTime();

		dbBanned.run("INSERT INTO banned VALUES (NULL, ?, ?);", [ip, timestamp], (err) => {
			if (err)
				console.error(err);
		});
	}

	static addFromPath(DB, path, res, redir) {
		let timestamp = new Date().getTime();

		DB.collection('files').find({"path": path}).toArray((err, result) => {
			if (err || result.length === 0)
				return console.error(err);
			else {
				DB.collection('banned').insertOne({"ip": result[0]["ip"], "timestamp": timestamp},
					(err, result) => {
						require('./files.js').del(DB, path, res, redir);
						if (err) console.error(err);
				});
			}
		});
	}

	static unban(DB, ip) {
		DB.collection('banned').deleteOne({"ip": ip}, (err, result) => {
			if (err)
				console.error(err);
		});
	}

	static checkBanned(DB, req, res, data, callbackTrue, callbackFalse) {
		DB.collection('banned').find({"ip": data['ip']}).toArray((err, result) => {
			if (err) {
				callbackFalse(res);
				console.error(err);
			}
			else callbackTrue(DB, req, res, data);
		});
	}
/*
		dbBanned.get("SELECT * FROM banned WHERE ip = ?;", data['ip'], (err, row) => {
			if (err) {
				callbackFalse(res)
				return console.error(err);
			}
			else if (typeof row === 'undefined')
				callbackTrue(DB, res, data);
			else
				callbackFalse(res)
		});
	}*/
}

module.exports = Banned;
