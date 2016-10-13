"use strict";

const http = require("http"),
	  utils = require("../utils"),
	  log = require("../log"),
	  shuffle = require("shuffle-array");

const TAG_BLACKLIST = global.config.get("sources.konachan.blacklist"),
	  MINIMUM_SCORE = global.config.get("sources.konachan.minimumScore"),
	  MINIMUM_SIZE = {
		  x: global.config.get("sources.konachan.minimumSize")[0],
		  y: global.config.get("sources.konachan.minimumSize")[1]
	  },
	  REPOSITORY = global.config.get("sources.konachan.repository");

const Konachan = {
	checkImage(image) {
		let tags = image.tags.split(" ");

		for(var bad_tag of TAG_BLACKLIST)
			if(tags.indexOf(bad_tag) > -1)
				return false; // tag exists in blacklist

		if(image.score < MINIMUM_SCORE)
			return false; // image does not meet minimum quality threshold

		if(image.jpeg_height < MINIMUM_SIZE.y)
			return false; // too small (x)

		if(image.jpeg_width < MINIMUM_SIZE.x)
			return false; // too small (x)

		const urlParts = image.jpeg_url.split("/");

		return urlParts[3] + "/" + urlParts[4] + "/" + urlParts[5];
	},
	getPage(callback, page) {
		http.request({
			host: REPOSITORY,
			path: "/post.json?tags=scenic%20nobody&limit=100&page=" + page
		}, (response) => {
			var str = "";

			response.on("data", (chunk) => {
				str += chunk;
			});

			response.on("end", () => {
				try {
					let data = JSON.parse(str),
						safeImages = [];

					for(let image of data)
						if(Konachan.checkImage(image))
							safeImages.push(check);

					shuffle(safeImages);

					callback(safeImages);
				} catch(e) {
					log.error("Konachan", "Error when calling API.");

					callback(false);
				}
			});
		}).end();
	},
	getImage(callback, id) {
		http.request({
			host: REPOSITORY,
			path: "/" + id
		}, (response) => {
			var total = response.headers["content-length"],
				current = 0;

			id = id.split("/")[1];

			var bufs = [],
				lastPostedStatus = 0;

			response.on("data", (d) => {
				const newStatus = Math.floor(current / total * 100);
				current += d.length;

				if(newStatus > (lastPostedStatus + 5)) {
					lastPostedStatus = newStatus;

					log.debug("Konachan", "Downloading image (" + newStatus + "%)...");
				}

				bufs.push(d);
			});

			response.on("end", () => {
				callback(Buffer.concat(bufs));
			});
		}).end();
	}
};

module.exports = Konachan;