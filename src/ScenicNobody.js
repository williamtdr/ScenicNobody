const Config = require("./config"),
	  konachan = require("./sources/konachan"),
	  moment = require("moment"),
	  log = require("./log"),
	  utils = require("./utils"),
	  twit = require("twit");

var persistenceConfig = new Config("config/persistence.json", onConfigLoad),
	T,
	readyToPost = false;

const state = {
	status: "Initializing...",
	lastImage: false
};

function checkAndDoPost() {
	if(!readyToPost)
		return false;

	var nextPost = persistenceConfig.get("sources.konachan.nextPost"),
		progress = persistenceConfig.get("sources.konachan.progress"),
		content = persistenceConfig.get("sources.konachan.content"),
		image = content[progress],
		delta = nextPost - utils.getUnixTime();

	if(delta < 0) {
		nextPost = utils.getUnixTime();
		delta = 0;

		persistenceConfig.set("sources.konachan.nextPost", nextPost);
	}

	state.status = "Ready to post " + moment(nextPost * 1000).fromNow() + ".";

	if(delta <= 0) {
		nextPost = utils.getUnixTime() + (60 * 60);

		persistenceConfig.set("sources.konachan.nextPost", nextPost);

		log.info("ScenicNobody", "Posting image!");
		state.lastImage = image;

		konachan.getImage((data) => {
			T.post("media/upload", {
				media_data: data.toString("base64")
			}, function(err, data, response) {
				var mediaIdStr = data.media_id_string,
					meta_params = {
					media_id: mediaIdStr, alt_text: {
							text: image.tags
						}
					};

				T.post("media/metadata/create", meta_params, function(err, data, response) {
					if (!err) {
						var params = {
							status: "Artwork by " + image.author + ":",
							media_ids: [mediaIdStr]
						};

						T.post("statuses/update", params, function(err, data, response) {
							console.log(data)
						});
					}
				})
			})
		}, konachan.imageDataToPath(image));

		advance();
	}
}

function advance() {
	var page = persistenceConfig.get("sources.konachan.page"),
		progress = persistenceConfig.get("sources.konachan.progress"),
		content = persistenceConfig.get("sources.konachan.content"),
		nextPost = persistenceConfig.get("sources.konachan.nextPost");

	if(content.length === 0) {
		return konachan.getPage((data) => {
			state.status = "Loading page data...";

			if(!data) {
				page = 0;
				persistenceConfig.set("sources.konachan.page", page);

				return advance();
			}

			persistenceConfig.set("sources.konachan.content", data);
			advance();
		}, page);
	}

	progress++;
	persistenceConfig.set("sources.konachan.progress", progress);
	if(progress > content.length) {
		log.info("ScenicNobody", "End of page reached, refreshing...");
		progress = -1;
		page++;

		persistenceConfig.set("sources.konachan.content", []);
		persistenceConfig.set("sources.konachan.page", page);
		persistenceConfig.set("sources.konachan.progress", progress);

		return advance();
	}

	if(nextPost === 0 || nextPost < utils.getUnixTime())
		nextPost = utils.getUnixTime() + 15;

	readyToPost = true;

	persistenceConfig.set("sources.konachan.nextPost", nextPost);
}

function onConfigLoad() {
	T = new twit({
		consumer_key: global.config.get("twitter.consumer.key"),
		consumer_secret: global.config.get("twitter.consumer.secret"),
		access_token: global.config.get("twitter.access.key"),
		access_token_secret: global.config.get("twitter.access.secret")
	});

	advance();
}

module.exports = {
	state: state
};

setInterval(checkAndDoPost, 1000);