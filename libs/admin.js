"use strict";

class Admin {
	constructor() {
	}

	static setToken(DB, req, res, login) {
		const md5 = require('md5');

		let sess = req.session
			,token = md5(new Date().getTime() + login);

		DB.collection('admin').updateOne(
			{"_id": login},
			{$set: {"token": token}},
			(err, result) => {
			if (err)
				console.error(err);
			else
				sess.token = token;
			res.redirect('/admin');
		});
	}

	static checkToken(DB, req, res, data, callbackTrue, callbackFalse) {
		let sess = req.session;

		if (!sess || !sess.token) {
			callbackFalse(res);
		}
		else {
			DB.collection('admin').find({token: sess.token}).toArray((err, result) => {
				if (err) {
					callbackFalse(res);
					return console.error(err);
				}
				else if (result.length === 0)
					callbackFalse(res);
				else
					callbackTrue(DB, res, data);
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
