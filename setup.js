var fs = require('fs')
,config = JSON.parse(fs.readFileSync('./config.json'))
,sqlite3 = require('sqlite3')
,dbUsers = new sqlite3.Database('db/users.db')
,dbBanned = new sqlite3.Database('db/banned.db')
,dbUploads = new sqlite3.Database('db/uploads.db');

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
		timestamp INTEGER,\
		download_number INTEGER DEFAULT 0);", (err) => {
	});
});
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
		UNIQUE (ip));", (err) => {
	});
});
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
		}
	);
	var bcrypt = require('bcrypt');
	var salt = bcrypt.genSaltSync(10);
	var hash = bcrypt.hashSync(config["adminPassword"], salt);
	dbUsers.run("INSERT INTO users VALUES (?, ?, ?, ?);",
		[
			null,
			config["adminLogin"],
			hash,
			'toto'
		], (err) => {
			if (err) {
				console.error(err);
			}
		}
	);
	dbUsers.all("SELECT * FROM users;", (err, rows) => {
		console.log(rows);
	});
});
