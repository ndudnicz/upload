exports.uploads = function(res) {
	var sqlite3 = require('sqlite3');
	var dbUploads = new sqlite3.Database('db/uploads.db');

	dbUploads.serialize(() => {
		dbUploads.run("DROP TABLE IF EXISTS uploads;", (err) => {
			if (err) {
				console.log(err);
			}
		});
		dbUploads.run("CREATE TABLE IF NOT EXISTS uploads (\
				id INTEGER PRIMARY KEY AUTOINCREMENT,\
				path TEXT,\
				filename TEXT,\
				ip TEXT,\
				reported INTEGER,\
				timestamp INTEGER);", (err) => {});
		if (res !== null) {
			res.redirect('/');
		}
		else {
			return;
		}
	});
}

exports.banned = function(res) {
	var sqlite3 = require('sqlite3');
	var dbBanned = new sqlite3.Database('db/banned.db');

	dbBanned.serialize(() => {
		dbBanned.run("DROP TABLE IF EXISTS banned;", (err) => {
			if (err) {
				console.log(err);
			}
		});
		dbBanned.run("CREATE TABLE IF NOT EXISTS banned (\
				id INTEGER PRIMARY KEY AUTOINCREMENT,\
				ip TEXT,\
				timestamp INTEGER,\
				UNIQUE (ip));", (err) => {});
	});
	if (res !== null) {
		res.redirect('/');
	}
	else {
		return;
	}
}

exports.users = function(res) {
	var sqlite3 = require('sqlite3');
	var dbUsers = new sqlite3.Database('db/users.db');

	dbUsers.serialize(() => {
		dbUsers.run("DROP TABLE IF EXISTS users;", (err) => {
			if (err) {
				console.log(err);
			}
		});
		dbUsers.run("CREATE TABLE IF NOT EXISTS users (\
				id INTEGER PRIMARY KEY AUTOINCREMENT,\
				login TEXT,\
				pass TEXT,\
				token TEXT);",
		(err) => {
			if (err) {
				return console.error(err);
			}
			else {
				var bcrypt = require('bcrypt');
				var salt = bcrypt.genSaltSync(10);
				//var hash = bcrypt.hashSync('', salt);

				dbUsers.run("INSERT INTO users VALUES (?, ?, ?, ?);",
				[
					null,
					'admin',
					hash,
					'toto'
				], (err) => {
					if (err) {
						console.error(err);
					}
				});
			}
		});
		if (res !== null) {
			res.redirect('/');
		}
		else {
			return;
		}
	});
}
