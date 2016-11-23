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
			if (err || !result) {
				if (err) console.error(err);
				res.redirect('/admin');
			}
			else if (result["ip"] === null) {
				require('./files.js').del(DB, path, res, redir);
			}
			else {
				DB.collection('banned').findAndModify(
					{"ip": result["ip"]},
					[],
					{
						$set: {"ip": result["ip"], "timestamp": timestamp}
					},
					{upsert: true}
				,(err, result) => {
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
