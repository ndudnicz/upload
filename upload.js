/* Config global var */

const _PORT_ = 3000
,__AVAILABLE_TIME__ = 1000 * 3600 * 24
,__FILE_SIZE__ = 10 * 1024 * 1024;

/* Middlewares */

const express = require('express')
,app = express()
,fileUpload = require('express-fileupload')
,md5 = require('md5')
,fs = require('fs')
,fsExtra = require('fs-extra')
,session = require('express-session')
,bodyParser = require('body-parser')
,bcrypt = require('bcrypt')
,Mongo = require('mongodb')
,assert = require('assert')
,sanitize = require('mongo-sanitize')

,Files = require('./libs/files.js')
,Admin = require('./libs/admin.js')
,Banned = require('./libs/banned.js')

,forbiddenUrl = [
	'admin'
	,'upload'
	,'ban'
	,'report'
	,'unreport'
	,'delete'
	,'download'
	,'unban'
	,'contact'
]
,config = JSON.parse(fs.readFileSync('./config.json'));

var DB
,url = config['mongodbURL'] + config['mongodbDB'];

Mongo.connect(url, (err, db) => {
	assert.equal(null, err);
	console.log(`Mongodb connected to ${config['mongodbURL']}${config['mongodbDB']}`);
	DB= db;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

/* General error handling: dont show your shit to everyone ! */

app.use((error, req, res, next) => {
	if (error) {
		console.error("ERROR");
		res.sendStatus(404);
	}
	else
	next();
});

app.use(fileUpload({
	limits: { fileSize: __FILE_SIZE__}
}));

app.use(session({
	secret: config["sessionSecret"],
	resave: false,
	saveUninitialized: false
}));

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
	let timeNow = new Date().getTime();
	var collection = DB.collection('files');
	collection.find().toArray((err, result) => {
		assert.equal(null, err);
		var n = result.length;
		for (let i in result) {
			if (timeNow - result[i]['timestamp'] > __AVAILABLE_TIME__)
			Files.del(result[i]["path"]);
			else
			n += 1;
		}
		res.render('index.ejs', { n : n });
	});
})
.post('/upload', (req, res) => {
	var data = {
		'ip': req.headers['x-real-ip'],
		'path': sanitize(req.body.perso)
	}

	// Callback true

	function callbackTrue(DB, req, res, data) {
		var filename = sanitize(req.files.file.name);
		DB.collection('files').find({path: data['path']}).toArray((err, result) => {

			// Check if the perso path already exists

			if (err) res.redirect('/');
			else {
				if (result.length !== 0 || !data['path'] || (/^[a-zA-Z0-9\-_]{3,50}$/).test(data['path']) === false || forbiddenUrl.indexOf(data['path']) !== -1)
					data['path'] = md5(filename + new Date().getTime());
				Files.add(DB, data['path'], filename, data['ip'], res, req);
			}
		});
	}

	// Callback false

	function callbackFalse(res) {
		res.redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	}


	if (req.files.file.name) {
		Banned.checkBanned(DB, req, res, data, callbackTrue, callbackFalse);
		return 0;
	}
	else {
		res.redirect('/');
		return 0;
	}
})/*
.get('/admin', (req, res) => {
	var callbackTrue = (res) => {
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
	dbUsers.get("SELECT * FROM users WHERE login = ?;", req.body.login, (err, row) => {
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
	var callbackTrue = (res) => {
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
	var callbackTrue = (res, data) => {
		Banned.addFromPath(data, res, '/admin');
	}
	var callbackFalse = (res) => {
		res.redirect('/');
	}
	Admin.checkToken(req, res, req.params.id, callbackTrue, callbackFalse);
})
.get('/download/:id', (req, res) => {
	dbFiles.get("SELECT * FROM uploads WHERE path = ?;", req.params.id, (err, row) => {
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
				dbFiles.run("UPDATE uploads SET download_number = download_number + 1 WHERE path = ?;", row['path'], (err) => {
					if (err)
					console.error(err);
				});
			}
		}
	});
})
.get('/report/:id', (req, res) => {
	Files.report(req.params.id, config["adminEmail"]);
	res.render('report.ejs');
})
.get('/contact', (req, res) => {
	res.render('contact.ejs', { publicKey: config['captchaPublicKey'], message: "", error: null, success: null });
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
				var mailSubject = 'Plus42.fr: new message.',
				mailContent = 'New message from: ' + req.body.email + ' [' + req.headers['x-real-ip'] + ']<br/><br/>' + htmlspecialchars(req.body.message),
				sendmail = require('sendmail')();
				sendmail({
					from: 'admin@plus42.fr'
					,subject: mailSubject
					,to:config['adminEmail']
					,html: mailContent
				}, function(err, reply) {
					console.error(err && err.stack);
					console.log(reply);
				});
				res.render('contact.ejs', { publicKey: config['captchaPublicKey'], message: "", error: null, success: "Message sent." });
			}
			else {
				res.render('contact.ejs', { publicKey: config['captchaPublicKey'], message: req.body.message, error: "Check the captcha.", success: null });
			}
		});
	}
	else {
		if (regMail.test(req.body.email) === false) {
			res.render('contact.ejs', { publicKey: config['captchaPublicKey'], message: req.body.message.substr(0, 1000), error: "Invalid email.", success: null });
		}
		else {
			res.render('contact.ejs', { publicKey: config['captchaPublicKey'], message: req.body.message.substr(0, 1000), error: "Invalid message.", success: null });
		}
	}
})
.get('/:id', (req, res) => {
	dbFiles.get("SELECT * FROM uploads WHERE path = ?;", req.params.id, (err, row) => {
		if (err || typeof row === 'undefined')
		res.redirect('/');
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
	var callbackTrue = (res, data) => {
		Banned.unban(data);
		res.redirect('/admin');
	};
	var callbackFalse = (res) => {
		res.redirect('/admin');
	}
	Admin.checkToken(req, res, ip, callbackTrue, callbackFalse);
})*/
.post('/checkurl', (req, res) => {

	// Ajax check personnalizeds url
	let url = sanitize(req.body.checkurl);
	if (url && (/^[a-zA-Z0-9\-_]{3,50}$/).test(url) === true &&
	forbiddenUrl.indexOf(url) === -1) {
		DB.collection('files').find({path: url}).toArray((err, result) => {
			if (err || result.length > 0) {
				res.send(false);
				return console.error(err);
			}
			else {
				res.send(true);
			}
		});
	}
	else
		res.send(false);
});

app.use((req, res, next) => {
	res.setHeader('Content-Type', 'text/html');
	res.sendStatus(404);
});

app.listen(_PORT_);
console.log('running on 127.0.0.1:' + _PORT_);
