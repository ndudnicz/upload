const assert = require('assert')
		,config = JSON.parse(require('fs').readFileSync('config.json'));

configJsonKeys = ["captchaPublicKey", "captchaSecretKey", "adminLogin"
	, "adminPassword", "adminEmail", "sessionSecret", "mongodbUser", "mongodbPwd"
	,"mongodbURL", "mongodbDB"]

describe('config.json keys test', () => {
	describe('#1', () => {
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
});
