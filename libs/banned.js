"use strict";

class Banned {

	constructor() {
	}

	static all(DB) {
		DB.collection('banned').find({}),toArray((err, result)=>{
			if (err) console.error(err);
			console.log(result);
		});
	}
/*
	static add(ip) {
		const sqlite3 = require('sqlite3')
				,dbBanned = new sqlite3.Database('db/banned.db');

		let timestamp = new Date().getTime();

		dbBanned.run("INSERT INTO banned VALUES (NULL, ?, ?);", [ip, timestamp], (err) => {
			if (err)
				console.error(err);
		});
	}
*/
	static addFromPath(DB, path, res, redir) {
		let timestamp = new Date().getTime();

		DB.collection('files').findOne({"path": path}, (err, result) => {
			if (err || result.length === 0)
				return console.error(err);
			else {
				DB.collection('banned').findAndModify({
					query: {"ip": result["ip"]},
					update: {
						$setOnInsert: {"ip": result["ip"], "timestamp": timestamp}
					},
					new: true,
					upsert: true
				},(err, result) => {
						console.log(result);
						require('./files.js').del(DB, path, res, redir);
						if (err) console.error(err);
				});
			}
		});
	}

	static unban(DB, ip) {
		DB.collection('banned').deleteOne({"ip": ip}, (err, result) => {
			if (err) console.error(err);
		});
	}

	static checkBanned(DB, req, res, data, callbackTrue, callbackFalse) {
		DB.collection('banned').findOne({"ip": data['ip']}, (err, result) => {
			if (err) {
				res.redirect('/');
				console.error(err);
			}
			else if (result) callbackFalse(res);
			else callbackTrue(DB, req, res, data);
		});
	}
}

module.exports = Banned;
