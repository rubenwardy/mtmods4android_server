var fs = require('fs');
var memCache = require('memory-cache');
var cacheTime = 1000*60*5;
var reports = null;

try {
	reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));
} catch(e) {
	reports = {};
}

function getListNoReports()
{
	var json = memCache.get("listNoReports");
	if (json) {
		console.log("getListNoReports cache hit")
	} else {
		console.log("Cache miss, regenerating listNoReports");
		json = JSON.parse(fs.readFileSync("crawler/out/list.json", 'utf8'));
		memCache.put("listNoReports", json, cacheTime);
	}
	return json;
}

function getList() {
	var res = memCache.get("listWithReports");
	if (!res) {
		console.log("Cache miss, regenerating listWithReports");
		res = getListNoReports();
		for (var i = 0; i < res.length; i++) {
			var mod = res[i];
			var idx = mod.author + "/" + mod.basename;
			var reps = reports[idx];
			if (reps) {
				mod.reports = {};
				for (var j = 0; j < reps.length; j++) {
					var report = reps[j];
					mod.reports[report.type] =
						mod.reports[report.type] ? mod.reports[report.type] + 1 : 1;
				}
			}
		}
		memCache.put("listWithReports", res, cacheTime);
	} else {
		console.log("getList:listWithReports cache hit");
	}

	return res;
}

function getOldListNoReports()
{
	var json = memCache.get("oldListNoReports");
	if (!json) {
		console.log("Cache miss, regenerating listNoReports");
		json = JSON.parse(fs.readFileSync("crawler/out/old_list.json", 'utf8'));
		memCache.put("oldListNoReports", json, cacheTime);
	} else {
		console.log("Cache hit, getOldListNoReports");
	}
	return json;
}

function getOldList() {
	var res = memCache.get("oldListWithReports");
	if (!res) {
		console.log("Cache miss, regenerating listWithReports");
		res = getOldListNoReports();
		for (var i = 0; i < res.length; i++) {
			var mod = res[i];
			var idx = mod.author + "/" + mod.basename;
			var reps = reports[idx];
			if (reps) {
				mod.reports = {};
				for (var j = 0; j < reps.length; j++) {
					var report = reps[j];
					mod.reports[report.type] =
						mod.reports[report.type] ? mod.reports[report.type] + 1 : 1;
				}
			}
		}
		memCache.put("oldListWithReports", res, cacheTime);
	} else {
		console.log("Cache hit, getOldList");
	}

	return res;
}

function getMod(modname, author) {
	var retval = memCache.get("mod_" + modname);
	if (retval) {
		console.log("cache hit, getMod");
		return retval;
	}

	console.log("Cache miss, regenerating getMod");

	var list = getListNoReports();

	var is_id = /^\d+$/.test(modname.trim());

	for (var i = 0; i < list.length; i++) {
		var mod = list[i];
		if (
					(is_id && i == modname) ||
					(!is_id && mod.basename == modname && (!author || mod.author == author))
				) {
			mod.id = i;
			memCache.put("mod_" + modname, mod, cacheTime);
			return mod;
		}
	}

	return null;
}

function getPopularMods()
{
	var retval = memCache.get("popularMods");
	if (!retval) {
		console.log("Cache miss, regenerating popularMods");

		var res = JSON.parse(fs.readFileSync("crawler/out/list.json", 'utf8'));
		var lookup = {};
		for (var i = 0; i < res.length; i++) {
			var mod = res[i];
			mod.downloads = 0;
			lookup[mod.author + "/" + mod.basename] = mod;
		}

		var lines = fs.readFileSync("downloads.txt", 'utf8').split("\n");
		for (var i = 0; i < lines.length; i++) {
			var parts = lines[i].split("\t");
			if (parts.length > 4 && parts[0] == "200") {
				var author = parts[2];
				var modname = parts[3];
				var mod = lookup[author + "/" + modname];
				if (mod) {
					mod.downloads++;
				} else {
					console.log("Mod " + author + "/" + modname + " not found in list.json! (Model.getPopularMods)")
				}
			}
		}

		res.sort(function(a,b) {
			return (a.downloads < b.downloads) ? 1 : ((b.downloads < a.downloads) ? -1 : 0);
		});
		retval = res.splice(0, 10);
		memCache.put("popularMods", retval, cacheTime);
	} else {
		console.log("cache hit, getPopularMods")
	}

	return retval;
}

var accepted_types = ["mal", "dw", "other"];
function validateReport(res) {
	return res.author && res.modname && res.list &&
		accepted_types.indexOf(res.type) >= 0;
}

setInterval(function() {
	// Save state
	var text = JSON.stringify(reports);
	fs.writeFileSync("reports.json", text, "utf8");
}, 10000);

function report(res) {
	if (validateReport(res)) {
		var idx = res.author + "/" + res.modname;
		reports[idx] = reports[idx] || [];
		reports[idx].push(res);

		return true;
	} else {
		return false;
	}
}

module.exports = {
	report: report,
	getOldList: getOldList,
	getOldListNoReports: getOldListNoReports,
	getList: getList,
	getListNoReports: getListNoReports,
	getMod: getMod,
	getPopularMods: getPopularMods,
	getReports: function() {
		return reports;
	},
	getVerified: function() {
		return JSON.parse(fs.readFileSync("crawler/data/verified.json", 'utf8'));
	},
	getBlacklist: function() {
		return JSON.parse(fs.readFileSync("crawler/data/blacklist.json", 'utf8'));
	},
	getModStatuses: function() {
		return JSON.parse(fs.readFileSync("crawler/out/lookup.json", 'utf8'));
	},
	getAuthorModStatuses: function(author) {
		var lookup = this.getModStatuses();
		if (author == "all") {
			var ret = [];
			for (var key in lookup) {
				if (lookup.hasOwnProperty(key)) {
					for (var i = 0; i < lookup[key].length; i++) {
						ret.push(lookup[key][i])
					}
				}
			}
			return ret;
		} else {
			return lookup[author];
		}
	}
};
