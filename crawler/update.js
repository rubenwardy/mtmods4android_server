if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined'
			? args[number]
			: match
			;
		});
	};
}

var sort_by;
(function() {
    // utility functions
    var default_cmp = function(a, b) {
			if (a.toLowerCase)
				a = a.toLowerCase();
			if (b.toLowerCase)
				b = b.toLowerCase();
            if (a == b) return 0;
            return a < b ? -1 : 1;
        },
        getCmpFunc = function(primer, reverse) {
            var dfc = default_cmp, // closer in scope
                cmp = default_cmp;
            if (primer) {
                cmp = function(a, b) {
                    return dfc(primer(a), primer(b));
                };
            }
            if (reverse) {
                return function(a, b) {
                    return -1 * cmp(a, b);
                };
            }
            return cmp;
        };

    // actual implementation
    sort_by = function() {
        var fields = [],
            n_fields = arguments.length,
            field, name, reverse, cmp;

        // preprocess sorting options
        for (var i = 0; i < n_fields; i++) {
            field = arguments[i];
            if (typeof field === 'string') {
                name = field;
                cmp = default_cmp;
            }
            else {
                name = field.name;
                cmp = getCmpFunc(field.primer, field.reverse);
            }
            fields.push({
                name: name,
                cmp: cmp
            });
        }

        // final comparison function
        return function(A, B) {
            var a, b, name, result;
            for (var i = 0; i < n_fields; i++) {
                result = 0;
                field = fields[i];
                name = field.name;

                result = field.cmp(A[name], B[name]);
                if (result !== 0) break;
            }
            return result;
        }
    }
}());

var fs = require('fs');
var RepoServers = require('./reposervers');

// Settings
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
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


var http = require("http");
var url = "http://krock-works.16mb.com/MTstuff/modList.php";
console.log("Fetching list from " + url);
http.get(url, function(res) {
	var body = '';

	res.on('data', function(chunk) {
		body += chunk;
	});

	res.on('end', function() {
		console.log("Got list");
		var resp = JSON.parse(body);
		if (!resp)
			return;

		// Stats
		var min_size =  0;
		var longest = "";
		var c_lm = 0;
		var c_lb = 0;
		var c_wt = 0;
		var c_a = 0;
		var c_b = 0;
		var c_ver = 0;
		var c_potwrong = 0;
		var c_link_error = 0;
		var c_github = 0;
		var total = resp.length;
		var ret = [];
		var out_errors = {};
		function addMod(author, details) {
			author = author.toLowerCase();
			if (details.constructor != Object) {
				console.log(author);
				console.log(details);
				throw("Details is not an object!");
			}

			var a = out_errors[author];
			if (!a) {
				a = [];
				out_errors[author] = a;
			}
			a.push(details);
		}
		function addModReason(author, mod, reason) {
			var res = {};
			for (var key in mod) {
				if (mod.hasOwnProperty(key)) {
					res[key] = mod[key];
				}
			}
			res.msg = reason;
			addMod(author, res);
		}

		function addSuccess(author, mod) {
			addModReason(author, mod, "added");
		}

		var reposervers = [];
		reposervers.push(new (RepoServers.GithubRepoServer)());

		function processMod(mod) {
			if (mod.description) {
				if (mod.description.length > min_size) {
					min_size = mod.description.length;
					longest = mod.description;
				}
			}

			mod.score = 0;

			// Check mod author
			if (!mod.author || mod.author == "") {
				c_a++;
				return false;
			}

			// Check mod type
			if (!mod.type || !(mod.type == "1" || mod.type == "2")) {
				addModReason(mod.author, mod, "Not in Mod Releases");
				c_wt++;
				return false;
			}

			// Check mod link
			if (!mod.link || mod.link == "") {
				addModReason(mod.author, mod, "No download link");
				c_lm++;
				return false;
			}

			// Check link for black list
			mod.link = mod.link.trim();
			if (linkIsBlacklisted(mod.link)) {
				addModReason(mod.author, mod, "Download link is in blacklist");
				c_lb++;
				return false;
			}

			if (mod.link.toLowerCase().indexOf("github.com") >= 0) {
				c_github++;
			}

			for (var i = 0; i < reposervers.length; i++) {
				var reposerver = reposervers[i];
				var repo = reposerver.getRepoFromURL(mod.link);
				if (repo) {
					mod.pending = (mod.pending) ? mod.pending + 1 : 1;
					mod.link = undefined;
					mod.repo = reposerver.getRepoURL(repo);
					reposerver.getDownloadAndHash(repo, null).then(function(res) {
						mod.pending--;
						var link = res.link;
						var commit = res.commit;
						mod.link = link;
						mod.commit_sha = commit;

						if (linkIsBlacklisted(mod.link)) {
							addModReason(mod.author, mod, "Download link is in blacklist");
							c_lb++;
						}
					}).catch(function(e) {
						mod.pending--;
					})
				}
			}

			// Get modname
			var re = /\[(.+?)\]/g;
			var s = mod.title;
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
				addModReason(mod.author, mod, "Unable to detect modname");
				c_b++;
				return false;
			}
			mod.name = basename.toLowerCase();
			mod.verified = 0;

			// Strip title
			mod.title = mod.title.replace("[" + mod.name + "]", "")
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
			var row = db[mod.author.toLowerCase() + "/" + mod.name.toLowerCase()];
			if (row) {
				for (var key in row) {
					if (row.hasOwnProperty(key)) {
						mod[key] = row[key];
						if (key == "description") {
							mod.score += 5;
							mod[key] = mod[key].trim();
						}
					}
				}
			}

			if (mod.description) {
				if (mod.description.length > min_size) {
					min_size = mod.description.length;
				}
			}

			addSuccess(mod.author, mod);

			ret.push(mod);

			return true;
		}

		for (var i = 0; i < total; i++) {
			processMod(resp[i]);
		}

		console.log("Sorting...");
		ret.sort(sort_by({name:'score', primer: parseInt, reverse: true}, 'name'));

		var text = JSON.stringify(ret);
		fs.writeFileSync(settings.listfile, text);

		var text2 = JSON.stringify(out_errors);
		fs.writeFileSync(settings.lookupfile, text2);

		var not_added = (c_lm + c_a + c_lb + c_wt + c_b + c_link_error);
		console.log("Wrote " + ret.length + " entries to file.");
		console.log(not_added + " out of " + total + " entries weren't added.");
		console.log(" - " + c_wt + " were not mods or modpacks in mod releases.");
		console.log(" - " + c_a + " had no author.");
		console.log(" - " + c_b + " failed to find a mod name / basename in their title.");
		console.log(" - " + c_lm + " had missing download/repo links.");
		console.log(" - " + c_lb + " had blacklisted download/repo links.");
		console.log(" - " + c_link_error + " had 404 or wrong content-type downloads.");
		console.log("Out of the added entries:");
		console.log(" - " + c_ver + " were verified/trusted.");
		console.log(" - " + (total - not_added - c_ver) + " were non-verified/untrusted.");
		console.log(" - " + c_potwrong + " had downloads which didn't mention the modname.");
		console.log(" - " + c_github + " / " + (total - not_added) + " were on github.")
		console.log("Wrote list to " + settings.listfile);
		if (settings.debugout != "") {
			console.log("Dumped debug out into " + settings.debugout + "/")
		}
		console.log("Longest desc is " + min_size);
		console.log(longest);
	});
}).on('error', function(e) {
	console.log("Got an error: ", e);
});
