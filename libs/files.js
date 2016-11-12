"use strict";

class Files {

	constructor() {
	}

	static all(DB) {
		DB.collection('files').find({}),toArray((err, result)=>{
			if (err) console.error(err);
			console.log(result);
		});
	}

	static add(DB, path, filename, ip, res, req) {
		const __N_FILES__ = 500;												/*N_FILE MAX HERE*/
		const fs = require('fs')
		const assert = require('assert');
		var collection = DB.collection('files');

		// Check total number of file
		collection.find().toArray((err, result) => {
			if (err) {
				res.send("DB ERROR");
				return 0;
			}
			if (result.length < __N_FILES__) {

				// mkdir a new storage folder
				fs.mkdir('./files/' + path, () => {

					// mv the file from tmp to its new folder
					req.files.file.mv('./files/' + path + '/' + filename, (err) => {
						if (err) {
							res.send("DB ERROR");
							return 0;
						}
						var timestamp = new Date().getTime()
						,data = {
							"path": path
							,"filename": filename
							,"ip": ip
							,"reported": 0
							,"timestamp": timestamp
							,"download_number": 0
						};

						// Insert new data's file in DB
						collection.insertOne(data, (err, result) => {
							if (err) res.redirect('/');
							else res.redirect('/' + path);
						});
					});
				});
			}
		});
	}

	static del(DB, path, res, redir) {
		const fsExtra = require('fs-extra');

		DB.collection('files').deleteOne({"path": path}, (err, result) => {
			if (err) console.error(err);
			else {
				fsExtra.remove('./files/' + path, (err) => {
					if (err)
					return console.error(err);
				});
				if (res && redir)
				res.redirect(redir);
			}
		});
	}

	static report(DB, path, adminEmail) {
		var doc = DB.collection('files').findOneAndUpdate({"path": path}, {$set:{"reported": 1}});
		doc.then(result => {
			if (result.value.reported === 0) {
				let sendmail = require('sendmail')();
				let message = 'Yo nigga, you\'ve got a new report.<br>\
				Check it out ====><a href="https://www.plus42.fr/' + path + '">Click here !</a><====';
				sendmail({
					from: 'admin@plus42.fr',
					to: adminEmail,
					subject: 'Plus42.fr: New report',
					html: message
				}, (err, reply) => {
					console.error(err && err.stack);

				});
			}
		});
	}
}

module.exports = Files;
