var fs = require('fs');
var Mod = require("./mod");
var RepoServers = require('./reposervers');
var basename_override = JSON.parse(fs.readFileSync("data/basename_override.json", 'utf8'));
var db = JSON.parse(fs.readFileSync("data/db.json", 'utf8'));
var url_cachefile = JSON.parse(fs.readFileSync("data/url_result_cache.json", 'utf8'));

// Blacklists and verified lists
var link_blacklist = JSON.parse(fs.readFileSync("data/blacklist.json", 'utf8'));
var link_verified = JSON.parse(fs.readFileSync("data/verified.json", 'utf8'));
function linkIsBlacklisted(link) {
	for (var j = 0; j < link_blacklist.length; j++) {
		if (link.indexOf(link_blacklist[j]) >= 0) {
			return true;
		}
	}
	return false;
}

function linkIsVerified(link) {
	for (var j = 0; j < link_verified.length; j++) {
		if (link.indexOf(link_blacklist[j]) >= 0) {
			return true;
		}
	}
	return false;
}

function addMod(stats, author, details) {
	author = author || "error";
	author = author.toLowerCase();
	if (details.constructor != Object) {
		console.log(author);
		console.log(details);
		throw("Details is not an object!");
	}

	var a = stats.out_errors[author];
	if (!a) {
		a = [];
		stats.out_errors[author] = a;
	}
	a.push(details);
}

function addModReason(stats, author, mod, reason) {
	var res = {};
	for (var key in mod) {
		if (mod.hasOwnProperty(key)) {
			res[key] = mod[key];
		}
	}
	res.msg = reason;
	addMod(stats, author, res);
}

function addSuccess(stats, author, mod) {
	addModReason(stats, author, mod, "added");
}

console.log("Creating repo servers...");
var reposervers = [];
reposervers.push(new (RepoServers.GithubRepoServer)("data/cache_github.json"));

function getInfoFromModLink(stats, mod, link) {
	return new Promise(function(resolve, reject) {
		if (!link || link.length == 0) {
			reject("needs download link");
		}

		for (var i = 0; i < reposervers.length; i++) {
			var reposerver = reposervers[i];
			var repo = reposerver.getRepoFromURL(link);
			if (repo) {
				var sname = reposerver.getServerName();
				var cell = stats.source[sname]
				stats.source[sname] = (cell) ? cell + 1 : 1
				mod.repo_host = reposerver.getServerName();
				mod.repo = reposerver.getRepoURL(repo);
				reposerver.getAllInfo(repo, mod).then(resolve).catch(reject);
				return;
			}
		}
		mod.download_link = link;
		resolve();
	});
}

function processMod(stats, json) {
	return new Promise(function(resolve, reject) {
		var mod = new Mod(json.author);
		mod.type = json.type;
		mod.forum_url = "https://forum.minetest.net/viewtopic.php?t=" + json.topicId;
		mod.extractInfoFromTitle(json.title);

		getInfoFromModLink(stats, mod, json.link).then(function() {
			var problem = mod.getFirstProblem();
			if (problem) {
				addModReason(stats, mod.author, mod, problem);
				reject(problem);
			} else {
				addSuccess(stats, mod.author, mod);
				resolve(mod);
			}
		}).catch(function(e) {
			addModReason(stats, mod.author, json, e);
			reject(e);
		})
	});
}

function processAllMods(stats, json_array) {
	return new Promise(function(resolve, reject) {
		var waiting_for = 0;
		var res = [];
		var idx = 0;

		var int_id = setInterval(function() {
			var num_spawned = 0;
			for (var i = 0; i < 100 && idx + i < json_array.length && waiting_for < 100; i++) {
				waiting_for++;
				processMod(stats, json_array[i]).then(function(mod) {
					console.log("done");
					var obj = mod.toPlainDictionary();
					obj.score = mod.getScore();
					res.push(obj);
					waiting_for--;
				}).catch(function(e) {
					stats.errors[e] = (stats.errors[e] != null) ? (stats.errors[e] + 1) : 1;
					console.log("failed: " + e);
					waiting_for--;
				});
				num_spawned++;
				idx++;
			}

			console.log("Waiting for " + waiting_for + " (spawned " + num_spawned + ")");
			if (waiting_for == 0) {
				clearInterval(int_id);
				for (var i = 0; i < reposervers.length; i++) {
					reposervers[i].saveCache();
					console.log(reposervers[i].hits +" hits and " + reposervers[i].misses + " misses");
				}

				resolve(res);
			}
		}, 500);
	});
}

module.exports = {
	mod: Mod,
	processMod: processMod,
	processAllMods: processAllMods
};