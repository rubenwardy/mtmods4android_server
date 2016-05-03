var fs = require('fs');
var reports = null;

try {
	reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));
} catch(e) {
	reports = {};
}

function getListNoReports()
{
    return JSON.parse(fs.readFileSync("crawler/out/list.json", 'utf8'));
}

function getList() {
	var res = getListNoReports();
    for (var i = 0; i < res.length; i++) {
        var mod = res[i];
        var idx = mod.author + "/" + mod.name;
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

    return res;
}

function getMod(modname) {
	var list = getListNoReports();

	for (var i = 0; i < list.length; i++) {
		var mod = list[i];
		if (mod.name == modname) {
			mod.id = i;
			return mod;
		}
	}

	return null;
}

function getPopularMods()
{
	var res = JSON.parse(fs.readFileSync("crawler/out/list.json", 'utf8'));
	var lookup = {};
	for (var i = 0; i < res.length; i++) {
		var mod = res[i];
		mod.downloads = 0;
		lookup[mod.author + "/" + mod.name] = mod;
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

	return res.splice(0, 10);
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
		return lookup[author];
	}
};
