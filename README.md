**SETUP**:
- **setup a mongodb server**
- **npm install**
- **mkdir files**
- **you need a google account for the captcha keys**
- **touch config.json**:
```json
	{
		"captchaPublicKey": ""
		,"captchaSecretKey": ""
		,"adminEmail": ""
		,"sessionSecret": ""
		,"mongodbUser": ""
		,"mongodbPwd": ""
		,"mongodbURL": "mongodb://ip:port/"
		,"mongodbDB": ""
	}
```
- **touch config.setup.json**:
```json
	{
		"adminLogin": ""
		,"adminPassword": ""
	}
```

- **set a header 'x-real-ip' = 'remote ip' with your reverse proxy server nginx/apache/whateveryouwant**
- **node setup.js**
- **npm test**
- **node upload.js**
