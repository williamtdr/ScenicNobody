const konachan = require("./sources/konachan"),
	  twit = require("twit");

const T = new twit({
	consumer_key: global.config.get("twitter.consumer.key"),
	consumer_secret: global.config.get("twitter.consumer.secret"),
	access_token: global.config.get("twitter.access.key"),
	access_token_secret: global.config.get("twitter.access.secret")
});
