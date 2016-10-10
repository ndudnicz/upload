__AVAILABLE_TIME__ = 1000 * 3600 * 24;
__FILE_SIZE__ = 2 * 1024 * 1024;

var express = require('express');
var app = express();
var fileUpload = require('express-fileupload');
var md5 = require('md5');
var fs = require('fs');
var fsExtra = require('fs-extra');
var session = require('express-session');

app.listen(3000);

app.use(fileUpload({
	limits: { fileSize: __FILE_SIZE__}
}));

app.use(session({
	secret: 'topkek',
	resave: false,
	saveUninitialized: false
}));

app.get('/', (req, res) => {
	var sqlite3 = require('sqlite3');
	var dbFiles = new sqlite3.Database('./db/uploads.db');
	var Files = require('./models/files.js');
	var timeNow = new Date().getTime();

	dbFiles.all("SELECT * FROM uploads;", (err, row) => {
		if (err) {
			console.error(err);
		}
		else if (typeof row === 'undefined') {
			res.render('index.ejs', { n: 0 });
		}
		else {
			var n = 0;

			row.forEach((item) => {
				if (timeNow - item['timestamp'] > __AVAILABLE_TIME__) {
					Files.del(item['path']);
				}
				else {
					n += 1;
				}
			});
			res.render('index.ejs', { n: n });
		}
	});
})
.post('/upload', (req, res) => {
	var Files = require('./models/files.js');
	var filename = req.files.file.name;
	var path = md5(filename + new Date().getTime());
	var ip = req.headers['x-real-ip'];

	Files.add(path, filename, ip, res, req);
})
.get('/admin', (req, res) => {
	var Admin = require('./models/admin.js');

	var callbackTrue = (res) => {
		var sqlite3 = require('sqlite3');
		var dbFiles = new sqlite3.Database('db/uploads.db');

		dbFiles.all("SELECT * FROM uploads WHERE reported = 1;", (err, row) => {
			if (err || typeof row === 'undefined') {
				res.render('admin.ejs', { reported: [] })
			}
			else {
				res.render('admin.ejs', { reported: row })
			}
		});
	}

	var callbackFalse = (res) => {
		res.render('admin_non_log.ejs')
	}

	Admin.checkToken(req, res, null, callbackTrue, callbackFalse);
})
.post('/admin', (req, res) => {
	var sqlite3 = require('sqlite3');
	var dbUsers = new sqlite3.Database('db/users.db');
	var bcrypt = require('bcrypt');
	var Admin = require('./models/admin.js');

	dbUsers.get("SELECT * FROM users WHERE login = ?;",
	req.body.login,
	(err, row) => {
		if (err || typeof row === 'undefined') {
			res.redirect('/admin');
			return console.error(err);
		}
		else {
			if (bcrypt.compareSync(req.body.password, row.pass) === true) {
				Admin.setToken(req, res, req.body.login);
			}
			else {
				res.redirect('/admin');
			}
		}
	});
})
.get('/unreport/:id', (req, res) => {
	var Admin = require('./models/admin.js');
	var callbackTrue = (res) => {
		var sqlite3 = require('sqlite3');
		var dbFiles = new sqlite3.Database('db/uploads.db');

		dbFiles.run("UPDATE uploads SET reported = 0 WHERE path = ?;", req.params.id, (err) => {
			if (err) {
				console.error(err);
			}
			res.redirect('/admin');
		});
	}
	var callbackFalse = (res) => {
		res.redirect('/');
	}

	Admin.checkToken(req, res, null, callbackTrue, callbackFalse);
})
.get('/delete/:id', (req, res) => {
	var Admin = require('./models/admin.js');
	var callbackTrue = (res, data) => {
		var Banned = require('./models/banned.js');

		Banned.addFromPath(data, res, '/admin');
	}
	var callbackFalse = (res) => {
		res.redirect('/');
	}

	Admin.checkToken(req, res, req.params.id, callbackTrue, callbackFalse);
})
/*.get('/setup', (req, res) => {
	var Db = require('./db/setup.js');

	Db.uploads(null);
	Db.banned(null);
	Db.users(res);
})*/
.get('/download/:id', (req, res) => {
	var Files = require('./models/files.js');
	var sqlite3 = require('sqlite3');
	var db = new sqlite3.Database('db/uploads.db');

	db.get("SELECT * FROM uploads WHERE path = ?;", req.params.id, (err, row) => {
		if (err || typeof row === "undefined") {
			res.redirect('/');
		}
		else {
			if (new Date().getTime() - row['timestamp'] > __AVAILABLE_TIME__) {
				Files.del(req.params.id);
				res.redirect('/');
			}
			else {
				var file = './files/' + row['path'] + '/' + row['filename'];
				res.download(file);
			}
		}
	});
})
.get('/report/:id', (req, res) => {
	var Files = require('./models/files.js');
	var Banned = require('./models/banned.js');

	Files.report(req.params.id);
	res.render('report.ejs');
})
.get('/:id', (req, res) => {
	var Files = require('./models/files.js');
	var sqlite3 = require('sqlite3');
	var db = new sqlite3.Database('db/uploads.db');

	db.get("SELECT * FROM uploads WHERE path = ?;", req.params.id, (err, row) => {
		if (err || typeof row === "undefined") {
			res.redirect('/');
		}
		else {
			if (new Date().getTime() - row['timestamp'] > __AVAILABLE_TIME__) {
				Files.del(req.params.id);
				res.redirect('/');
			}
			else {
				res.render('download.ejs', { 'data': row });
			}
		}
	});
});

app.use((req, res, next) => {
	res.setHeader('Content-Type', 'text/html');
	res.sendStatus(404);
});
