const fs = require('fs')
,configSetup = JSON.parse(fs.readFileSync('./config.setup.json'))
,config = JSON.parse(fs.readFileSync('./config.json'))
,Mongo = require('mongodb')
,assert = require('assert')
,bcrypt = require('bcrypt');

var promise = new Promise((resolve, reject) => {
	let url = config['mongodbURL'] + config['mongodbDB'];
	Mongo.connect(url, (err, db) => {
		assert.equal(null, err);
		resolve(db);
	});
});

function deleteOne(collection, request, callback) {
	collection.deleteOne(request, (err, res) => {
		assert.equal(null, err);
		console.log("Admin deleted");
		callback();
	});
}

function insertOne(collection, data, callback) {
	collection.insertOne(data, (err, res) => {
		assert.equal(null, err);
		console.log("Admin created");
		callback();
	});
}

promise.then(db => {
	db.authenticate(config['mongodbUser'], config['mongodbPwd'], (err, res) => {
		assert.equal(null, err);

		let hash = bcrypt.hashSync(configSetup['adminPassword'], bcrypt.genSaltSync(10))
			,collection = db.collection('admin');

		deleteOne(collection, {"_id": configSetup['adminLogin']}, function() {
			var data = {
				"_id": configSetup['adminLogin']
				,"pwd": hash
				,"token": "toto"
			};
			insertOne(collection, data, function() {
				collection.find({}, (err, res) => {console.log("Setup done");});
				db.close();
			});
		});
	});
});
