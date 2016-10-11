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

app.set('view engine', 'ejs');

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
	var ip = req.headers['x-real-ip'];
	var Banned = require('./models/banned.js');
	var data = {
		'ip': ip,
		'req': req,
		'path': req.body.perso
	}
	var callbackTrue = (res, data) => {
		var Files = require('./models/files.js');
		var filename = data['req'].files.file.name;
		var sqlite3 = require('sqlite3');
		var dbFiles = new sqlite3.Database('db/uploads.db');

		dbFiles.get("SELECT * FROM uploads WHERE path = ?;", data['path'], (err, row) => {
			if (err) {
				res.redirect('/');
				return console.error(err);
			}
			else if (typeof row === 'undefined' &&
					data['path'] &&
					(/^[a-zA-Z0-9\-_]+$/).test(data['path']) &&
					data['path'].length >= 3 && data['path'].length <= 50) {
				var path = data['path'];
			}
			else {
				var md5 = require('md5');
				var path = md5(filename + new Date().getTime());
			}
			Files.add(path, filename, data['ip'], res, data['req']);
		});
	}
	var callbackFalse = (res) => {
		res.redirect('/');
	}

	if (req.files.file.name) {
		Banned.checkBanned(res, data, callbackTrue, callbackFalse);
	}
	else {
		res.redirect('/');
	}
})
.get('/admin', (req, res) => {
	var Admin = require('./models/admin.js');
	var callbackTrue = (res) => {
		var sqlite3 = require('sqlite3');
		var dbFiles = new sqlite3.Database('db/uploads.db');
		var dbBanned = new sqlite3.Database('db/banned.db');

		dbFiles.all("SELECT * FROM uploads;", (err, row) => {
			if (err || typeof row === 'undefined') {
				row = [];
				console.error(err);
			}
			dbBanned.all("SELECT * FROM banned;", (err, banned) => {
				if (err || typeof banned === 'undefined') {
					banned = [];
					console.error(err);
				}
				res.render('admin.ejs', { 'reported': row, 'banned': banned })
			});
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
				row['size'] = fs.statSync('./files/' + row['path'] + '/' + row['filename'])['size'];
				row['deleted'] = (__AVAILABLE_TIME__ - (new Date().getTime() - row['timestamp'])) / 1000;
				res.render('download.ejs', { 'data': row });
			}
		}
	});
})
.get('/unban/:ip', (req, res) => {
	var ip = req.params.ip;
	var Admin = require('./models/admin.js');
	var Banned = require('./models/banned.js');
	var callbackTrue = (res, data) => {
		console.log('true');
		var Banned = require('./models/banned.js');

		Banned.unban(data);
		res.redirect('/admin');
	};
	var callbackFalse = (res) => {
		console.log('false');
		res.redirect('/');
	}
	Admin.checkToken(req, res, ip, callbackTrue, callbackFalse);
});

app.use((req, res, next) => {
	res.setHeader('Content-Type', 'text/html');
	res.sendStatus(404);
});
