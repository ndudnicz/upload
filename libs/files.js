"use strict";

class Files {

	constructor() {
	}


	static all(DB) {
		DB.find().toArray((err, result) => {console.log(result);})
	}

	static add(DB, path, filename, ip, res, req) {
		const __N_FILES__ = 500;												/*N_FILE MAX HERE*/

		const fs = require('fs')
		,assert = require('assert');
		var collection = DB.collection('files');

		collection.find().toArray((err, result) => {
			assert.equal(null, err);
			if (result.length < __N_FILES__) {
				fs.mkdir('./files/' + path, () => {
					req.files.file.mv('./files/' + path + '/' + filename, (err) => {
						console.log('add');
						assert.equal(null, err);
						let timestamp = new Date().getTime()
						,data = {
								"path": path
								,"filename": filename
								,"ip": ip
								,"reported": 0
								,"timestamp": timestamp
								,"download_number": 0
						};
						var promise = new Promise((resolve, reject) => {
							collection.insertOne(data, (err, result) => {
								resolve(result);
								reject(err);
							});
						});
						promise.then(result=>{res.redirect('/')});
						promise.catch(result=>{res.redirect('/')})
					});
				});
			}
		});

		/*db.all("SELECT * FROM uploads;", (err, row) => {
			if (err) {
				console.error(err);
			}
			if (row.length < __N_FILES__) {
			}
			else
				res.redirect('/');
		});*/
	}

	static del(path, res, redir) {
		const sqlite3 = require('sqlite3')
				,db = new sqlite3.Database('db/uploads.db')
				,fsExtra = require('fs-extra');

		db.run("DELETE FROM uploads WHERE path = ?;", path, (err) => {
			if (err)
				console.error(err);
			else {
				fsExtra.remove('./files/' + path, (err) => {
					if (err)
						return console.error(err);
				});
				if (res && redir)
					res.redirect(redir);
			}
		});
	}

	static report(path, adminEmail) {
		const sqlite3 = require('sqlite3')
				,db = new sqlite3.Database('db/uploads.db');

		db.get("SELECT * FROM uploads WHERE path = ? AND reported = 0;", path, (err, row) => {
			if (err)
				console.error(err);
			else if (typeof row !== 'undefined') {
				let sendmail = require('sendmail')();
				let message = 'Yo nigga, you\'ve got a new report.<br>\
				Check it out ====><a href="https://www.plus42.fr/' + path + '">Click here !</a><====';
				sendmail({
					from: 'admin@plus42.fr',
					to: adminEmail,
					subject: 'Plus42.fr: New report',
					html: message
				}, (err, reply) => {
					console.error(err && err.stack);
					console.log(reply);
				});

				db.run("UPDATE uploads SET reported = 1 WHERE path = ?;", path);
			}
		});
	}
}

module.exports = Files;
