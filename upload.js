/* Config global var */

__AVAILABLE_TIME__ = 1000 * 3600 * 24;
__FILE_SIZE__ = 10 * 1024 * 1024;

/* Middlewares */

var express = require('express'),
	app = express(),
	fileUpload = require('express-fileupload'),
	md5 = require('md5'),
	fs = require('fs'),
	fsExtra = require('fs-extra'),
	session = require('express-session'),
	bodyParser = require('body-parser'),

	forbiddenUrl = [
		'admin'
		,'upload'
		,'ban'
		,'report'
		,'unreport'
		,'delete'
		,'download'
		,'unban'
		,'setup'
		,'contact'
	];
	config = JSON.parse(fs.readFileSync('./config.json'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

/* General error handling: dont show your shit to everyone ! */

app.use((error, req, res, next) => {
	if (error) {
		console.error("ERROR");
		res.sendStatus(404);
	}
	else {
		next();
	}
});

app.use(fileUpload({
	limits: { fileSize: __FILE_SIZE__}
}));

app.use(session({
	secret: 'topkek',
	resave: false,
	saveUninitialized: false
}));

app.use(express.static(__dirname + '/public'));

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
					(/^[a-zA-Z0-9\-_]{3,50}$/).test(data['path']) === true &&
					forbiddenUrl.indexOf(data['path']) === -1) {
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
		res.redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
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

//	Db.uploads(null);
//	Db.banned(null);
//	Db.users(res);
	Db.modify(res);
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
				db.run("UPDATE uploads SET download_number = download_number + 1 WHERE path = ?;", row['path'], (err) => {
					if (err)
						console.error(err);
				});
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
.get('/contact', (req, res) => {
	res.render('contact.ejs', { message: "", error: null, success: null });
})
.post('/contact', (req, res) => {
	var regMail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (regMail.test(req.body.email) === true && req.body.message.length > 0 && req.body.message.length <= 1000) {
		var request = require('request'),
			secret = config['captchaSecretKey'],
			captchaResponse = req.body['g-recaptcha-response'],
			remoteip = req.headers['x-real-ip'],
			url = 'https://www.google.com/recaptcha/api/siteverify',
			verifyUrl = url+'?secret='+secret+'&response='+captchaResponse+'&remoteip='+remoteip;
			htmlspecialchars = require('htmlspecialchars');
		request(verifyUrl, (error, resonse, body) => {
			body = JSON.parse(body);
			if (body.success === true) {
				var mailSubject = 'Plus42,fr: new message.',
					mailContent = 'New message from: ' + req.body.email + ' [' + req.headers['x-real-ip'] + ']<br/><br/>' + htmlspecialchars(req.body.message),
					sendmail = require('sendmail')();
				sendmail({
					from: 'admin@plus42.fr'
					,subject: mailSubject
					,to: 'ndudnicz@protonmail.com'
					,html: mailContent
				}, function(err, reply) {
					console.error(err && err.stack);
					console.log(reply);
				});
				res.render('contact.ejs', { message: "", error: null, success: "Message sent." });
			}
			else {
				res.render('contact.ejs', { message: req.body.message, error: "Check the captcha.", success: null });
			}
		});
	}
	else {
		if (regMail.test(req.body.email) === false) {
			res.render('contact.ejs', { message: req.body.message.substr(0, 1000), error: "Invalid email.", success: null });
		}
		else {
			res.render('contact.ejs', { message: req.body.message.substr(0, 1000), error: "Invalid message.", success: null });
		}
	}
})
.get('/:id', (req, res) => {
	var Files = require('./models/files.js');
	var sqlite3 = require('sqlite3');
	var db = new sqlite3.Database('db/uploads.db');
	db.get("SELECT * FROM uploads WHERE path = ?;", req.params.id, (err, row) => {
		if (err || typeof row === 'undefined') {
			res.redirect('/');
			//console.error(err);
		}
		else {
			if (new Date().getTime() - row['timestamp'] > __AVAILABLE_TIME__) {
				Files.del(req.params.id);
				return res.redirect('/');
			}
			else {
				row['size'] = fs.statSync('./files/' + row['path'] + '/' + row['filename'])['size'];
				row['deleted'] = (__AVAILABLE_TIME__ - (new Date().getTime() - row['timestamp'])) / 1000;
				return res.render('download.ejs', { 'data': row });
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
})
.post('/checkurl', (req, res) => {
	var sqlite3 = require('sqlite3');
	var dbFiles = new sqlite3.Database('db/uploads.db');
	var url = req.body.checkurl;
	if (url && (/^[a-zA-Z0-9\-_]{3,50}$/).test(url) === true &&
		forbiddenUrl.indexOf(url) === -1) {
		dbFiles.get("SELECT * FROM uploads WHERE path = ?;", url, (err, row) => {
			if (err) {
				res.send(false);
				return console.error(err);
			}
			else if (typeof row !== 'undefined')
				res.send(false);
			else
				res.send(true);
		});
	}
	else
		res.send(false);
});

app.use((req, res, next) => {
	res.setHeader('Content-Type', 'text/html');
	res.sendStatus(404);
});

app.listen(3000);