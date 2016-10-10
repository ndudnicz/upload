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
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');
		var fs = require('fs');

		db.all("SELECT * FROM uploads;", (err, row) => {
			if (err) {
				console.error(err);
			}
			if (row.length < 1024) {
				fs.mkdir('./files/' + path, () => {
					req.files.file.mv('./files/' + path + '/' + filename, (err) => {
						if (err) {
							res.redirect('/');
							return console.error(err);
						}
						else {
							var timestamp = new Date().getTime();
							var query = db.prepare("INSERT INTO uploads VALUES (?, ?, ?, ?, ?, ?);",
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

	static report(path) {
		var sqlite3 = require('sqlite3');
		var db = new sqlite3.Database('db/uploads.db');

		db.run("UPDATE uploads SET reported = 1 WHERE path = ?;", path);
	}
}

module.exports = Files;
