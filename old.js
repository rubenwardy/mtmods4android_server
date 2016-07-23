if (json.description) {
	if (json.description.length > min_size) {
		min_size = json.description.length;
		longest = json.description;
	}
}

json.score = 0;

// Check mod author
if (!json.author || json.author == "") {
	c_a++;
	return false;
}

// Check mod type
if (!json.type || !(json.type == "1" || json.type == "2")) {
	addModReason(json.author, json, "Not in Mod Releases");
	c_wt++;
	return false;
}

// Check mod link
if (!json.link || json.link == "") {
	addModReason(json.author, json, "No download link");
	c_lm++;
	return false;
}

// Check link for black list
json.link = json.link.trim();
if (linkIsBlacklisted(json.link)) {
	addModReason(json.author, json, "Download link is in blacklist");
	c_lb++;
	return false;
}

if (json.link.toLowerCase().indexOf("github.com") >= 0) {
	c_github++;
}

for (var i = 0; i < reposervers.length; i++) {
	var reposerver = reposervers[i];
	var repo = reposerver.getRepoFromURL(json.link);
	if (repo) {
		json.pending = (json.pending) ? json.pending + 1 : 1;
		json.link = undefined;
		json.repo = reposerver.getRepoURL(repo);
		reposerver.getDownloadAndHash(repo, null).then(function(res) {
			json.pending--;
			var link = res.link;
			var commit = res.commit;
			json.link = link;
			json.commit_sha = commit;

			if (linkIsBlacklisted(json.link)) {
				addModReason(json.author, json, "Download link is in blacklist");
				c_lb++;
			}
		}).catch(function(e) {
			json.pending--;
		})
	}
}

// Get modname
var re = /\[(.+?)\]/g;
var s = json.title;
var basename = null;
var m;
do {
	m = re.exec(s);
	if (m) {
		var tmp = m[1].trim();
		var regexp = /^[a-zA-Z0-9-_]+$/;
		if (tmp.search(regexp) != -1) {
			if (basename == null) {
				basename = tmp;
			} else {
				basename = null;
				break;
			}
		}
	}
} while (m);

// for (var key in basename_override) {
// 	if (basename_override.hasOwnProperty(key) && mod.link.indexOf(key) >= 0) {
// 		console.log("Overriding " + key + " -> " + basename_override[key]);
// 		basename = basename_override[key];
// 		break;
// 	}
// }

// Check modname/basename
if (basename == null) {
	addModReason(json.author, json, "Unable to detect modname");
	c_b++;
	return false;
}
json.name = basename.toLowerCase();
json.verified = 0;

// Strip title
json.title = json.title.replace("[" + json.name + "]", "")
	.replace("  ", " ").replace("  ", " ").replace("&#58;", ":")
	.replace("&#39;", "'").trim()

// var et = url_cachefile[mod.link];
// if (et) {
// 	if (et.status != 200) {
// 		if (et.status == -1) {
// 			addModReason(mod.author, mod, "Bad download link: wrong content-type");
// 		} else {
// 			addModReason(mod.author, mod, "Bad download link: " + et.status);
// 		}
// 		c_link_error++;
// 		if (settings.debugout != "") {
// 			fs.appendFileSync(settings.debugout + "/link_error.txt",
// 				mod.author + "/" + mod.name + "\t" + mod.link + "\t" + et.status + "\n");
// 		}
// 		return false;
// 	}
// 	mod.size = et.size;
// } else {
// 	console.log("No url_cache for " + mod.link);
// }

// Check for verified
// var verified = false;
// for (var j = 0; j < link_verified.length; j++) {
// 	if (mod.link.toLowerCase().indexOf(link_verified[j]) == 0) {
// 		verified = true;
// 		break;
// 	}
// }
// if (verified) {
// 	mod.score += 10;
// 	c_ver++;
// 	mod.verified = 1;
// } else if (settings.debugout != "") {
// 	fs.appendFileSync(settings.debugout + "/not_verified.txt", mod.name + "\t" + mod.link + "\n");
// }

// if (mod.link.toLowerCase().indexOf(mod.name.toLowerCase()) < 0) {
// 	c_potwrong++;
// 	if (settings.debugout != "") {
// 		fs.appendFileSync(settings.debugout + "/potwrong.txt", mod.author + "/" + mod.name + "\t" + mod.link + "\n");
// 	}
// }

// Adjust from DB
var row = db[json.author.toLowerCase() + "/" + json.name.toLowerCase()];
if (row) {
	for (var key in row) {
		if (row.hasOwnProperty(key)) {
			json[key] = row[key];
			if (key == "description") {
				json.score += 5;
				json[key] = json[key].trim();
			}
		}
	}
}

if (json.description) {
	if (json.description.length > min_size) {
		min_size = json.description.length;
	}
}

addSuccess(json.author, json);

ret.push(json);
