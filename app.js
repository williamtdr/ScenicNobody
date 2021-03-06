const Config = require("./src/config"),
	  log = require("./src/log");

function onConfigLoad() {
	require("./src/interface/http");
}

log.setSourceColor("System", "blue");
log.setSourceColor("Config", "cyan");
log.setSourceColor("HTTP", "green");

log.info("System", "ScenicNobody");
log.info("System", "by @williamtdr");
log.info("Config", "Reading configuration...");

global.config = new Config("config/config.json", onConfigLoad);
