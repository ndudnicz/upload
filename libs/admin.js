"use strict";

class Admin {
	constructor() {
	}

	static setToken(req, res, login) {
		const sqlite3 = require('sqlite3')
				,dbUsers = new sqlite3.Database('db/users.db')
				,md5 = require('md5');

		let sess = req.session
			,token = md5(new Date().getTime() + req.body.login);

		dbUsers.run("UPDATE users SET token = ? WHERE login = ?;"
		,[ token, login ]
		,(err) => {
			if (err)
				console.error(err);
			else
				sess.token = token;
			res.redirect('/admin');
		});
	}

	static checkToken(req, res, data, callbackTrue, callbackFalse) {
		const sqlite3 = require('sqlite3')
				,dbUsers = new sqlite3.Database('db/users.db')

		let sess = req.session;

		if (!sess || !sess.token) {
			callbackFalse(res);
		}
		else {
			dbUsers.get("SELECT * FROM users WHERE token = ?;",
			sess.token,
			(err, row) => {
				if (err || typeof row === 'undefined') {
					callbackFalse(res);
					return console.error(err);
				}
				else
					callbackTrue(res, data);
			});
		}
	}

	static changePassword(res, login, oldPass, newPass) {
		const sqlite3 = require('sqlite3')
				,dbUsers = new sqlite3.Database('db/users.db')
				,bcrypt = require('bcrypt');

		let salt = bcrypt.genSaltSync(10)
			,newHash = bcrypt.hashSync(newPass, salt);

		dbUsers.get("SELECT * FROM users WHERE login = ?;", login, (err, row) => {
			if (err || typeof row === 'undefined') {
				res.redirect('/admin');
				return console.error(err);
			}
			else {
				if (bcrypt.compareSync(oldPass, row.pass) === true) {
					dbUsers.run("UPDATE users SET pass = ? WHERE login = ?;"
					,[newHash, login]
					,(err) => {
						if (err)
							console.error(err)
						res.redirect('/admin');
					});
				}
				else
					res.redirect('/admin');
			}
		});
		res.redirect('/admin');
	}
}

module.exports = Admin;
