var fs = require('fs');
var reports = null;

try {
	reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));
} catch(e) {
	reports = {};
}

function getList()
{
    var res = JSON.parse(fs.readFileSync("crawler/out/list.json", 'utf8'));

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
