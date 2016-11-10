const assert = require('assert')
,config = JSON.parse(require('fs').readFileSync('config.json'))
,Mongo = require('mongodb');

configJsonKeys = ["captchaPublicKey", "captchaSecretKey", "adminLogin"
, "adminPassword", "adminEmail", "sessionSecret", "mongodbUser", "mongodbPwd"
,"mongodbURL", "mongodbDB"]

describe('', () => {

	// Check config.json file

	describe('#Config.json tests', () => {
		it('Existing keys', () => {
			for (let i in configJsonKeys)
			assert.notEqual(undefined, config[configJsonKeys[i]], `Missing key in config.json: ${configJsonKeys[i]}`);
		});
		it('Existing values', () => {
			for (let i in configJsonKeys) {
				if (configJsonKeys[i] === 'adminLogin' || configJsonKeys[i] === 'adminPassword')
				continue;
				assert.notEqual("", config[configJsonKeys[i]], `Missing value in config.json: ${configJsonKeys[i]} => EMPTY`);
			}
		});
		it('Admin keys empty in prod', () => {
			assert.equal("", config["adminLogin"], "adminLogin should be empty in prod");
			assert.equal("", config["adminPassword"], "adminPassword should be empty in prod");
		});
	});
	describe('#Mongodb tests', () => {

		// Test if mongodd is running

		let promise = new Promise((resolve, reject) => {
			it(`Connexion on ${config['mongodbURL']}${config['mongodbDB']}`, (done) => {
				var url = config['mongodbURL'] + config['mongodbDB'];
				Mongo.connect(url, (err, db) => {
					if (err) done(err);
					else {
						resolve(db);
						done();
					}
				});
			});
		});

		// Test mongodb user/pwd/db

		it(`Auth (user:${config['mongodbUser']}, db:${config['mongodbDB']})`, (done) => {
			promise.then(db => {
				db.authenticate(config['mongodbUser'], config['mongodbPwd'], (err, res) => {
					if (err) done(err);
					else done();
				});
			});
		});
	});
});
