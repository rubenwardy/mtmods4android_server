"use strict";
var memCache = require('memory-cache');
var fs = require("fs");

// author	"yaman"
// type	"3"
// basename	"aging"
// title	"Aging"
// description	"Adds aging algorithms wi…s, and decreased speed."
// forum_url	"https://forum.minetest.net/viewtopic.php?t=12842"
// download_link	"https://github.com/yaman…55421ea644c0261e2603.zip"
// download_size	-1
// repo_host	"github.com"
// repo	"https://github.com/yamanq/minetest-mod-aging.git"
// commit_hash	"bd21f1c1141e2cbdb0a655421ea644c0261e2603"
// repo_author	"yamanq"
// repo_name	"minetest-mod-aging"
// score	5

function get() {
	return JSON.parse(fs.readFileSync("list.json", "utf8")).map((x) => {
		return {
			author: x.author,
			type: 3,
			basename: x.name,
			title: x.title,
			description: x.short_description,
			forum_url: null,
			download_link: "https://content.minetest.net/packages/" + x.author + "/" + x.name + "/download/",
			download_size: -1,
			repo_host: null,
			repo: null,
			commit_hash: null,
			repo_author: x.author,
			repo_name: null,
			score: x.score,
			thumbnail: x.thumbnail,
		};
	});
}


module.exports = {
	get: get,
};
