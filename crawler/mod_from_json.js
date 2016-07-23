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
reposervers.push(new (RepoServers.GithubRepoServer)());

function getInfoFromModLink(stats, mod, link) {
	return new Promise(function(resolve, reject) {
		for (var i = 0; i < reposervers.length; i++) {
			var reposerver = reposervers[i];
			var repo = reposerver.getRepoFromURL(link);
			if (repo) {
				mod.repo_host = reposerver.getServerName();
				mod.repo = reposerver.getRepoURL(repo);
				reposerver.getDownloadAndHash(repo, null).then(function(res) {
					var link = res.link;
					var commit = res.commit;
					mod.download_link = link;
					mod.commit_hash = commit;
					resolve();
				}).catch(function(e) {
					reject(e);
				})
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
		mod.forum_url = "https://forum.minetest.net/viewtopic.php?t=" + json.topicId;
		mod.extractInfoFromTitle(json.title);

		getInfoFromModLink(stats, mod, json.link).then(function() {
			var problem = mod.getFirstProblem();
			if (problem) {
				addModReason(stats, mod.author, json, problem);
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
		for (var i = 0; i < json_array.length && i < 10; i++) {
			waiting_for++;
			processMod(stats, json_array[i]).then(function(mod) {
				console.log("done");
				res.push(mod.toPlainDictionary());
				waiting_for--;
			}).catch(function(e) {
				console.log("failed: " + e);
				waiting_for--;
			})
		}
		var int_id = setInterval(function() {
			if (waiting_for == 0) {
				clearInterval(int_id);
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
