"use strict";

class Files {

	constructor() {
	}

	static all() {
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');

		db.all("SELECT * FROM uploads", (err, row) => {
			console.log(row);
		});
	}

	static add(path, filename, ip, res, req) {
		var __N_FILES__ = 500;												/*N_FILE MAX HERE*/
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');
		var fs = require('fs');
		db.all("SELECT * FROM uploads;", (err, row) => {
			if (err) {
				console.error(err);
			}
			if (row.length < __N_FILES__) {
				fs.mkdir('./files/' + path, () => {
					req.files.file.mv('./files/' + path + '/' + filename, (err) => {
						if (err) {
							res.redirect('/');
							return console.error(err);
						}
						else {
							var timestamp = new Date().getTime();
							var query = db.prepare("INSERT INTO uploads VALUES (?, ?, ?, ?, ?, ?, 0);",
							[
								null,
								path,
								filename,
								ip,
								0,
								timestamp
							]);

							query.run((err) => {
								if (err) {
									return console.error(err);
								}
								res.redirect('/' + path);
							});
							query.finalize();
						}
					});
				});
			}
			else {
				res.redirect('/');
			}
		});
	}

	static del(path, res, redir) {
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');
		var fsExtra = require('fs-extra');

		db.run("DELETE FROM uploads WHERE path = ?;", path, (err) => {
			if (err) {
				console.error(err);
			}
			else {
				fsExtra.remove('./files/' + path, (err) => {
					if (err) {
						return console.error(err);
					}
				});
				if (res && redir) {
					res.redirect(redir);
				}
			}
		});
	}

	static report(path, adminEmail) {
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');

		db.get("SELECT * FROM uploads WHERE path = ? AND reported = 0;", path, (err, row) => {
			if (err)
				console.error(err);
			else if (typeof row !== 'undefined') {
				var sendmail = require('sendmail')();
				var message = 'Yo nigga, you\'ve got a new report.<br>\
				Check it out ====><a href="https://www.plus42.fr/' + path + '">Click here !</a><====';
				sendmail({
					from: 'admin@plus42.fr',
					to: adminEmail,
					subject: 'Plus42.fr: New report',
					html: message
				}, function(err, reply) {
					console.error(err && err.stack);
					console.log(reply);
				});

				db.run("UPDATE uploads SET reported = 1 WHERE path = ?;", path);
			}
		});
	}
}

module.exports = Files;
