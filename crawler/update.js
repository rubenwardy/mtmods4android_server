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
var Mod = require('./mod_from_json');

// Settings
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
var http = require("http");
var url = settings.modlist_source;
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
		var stats = {
			min_size: 0,
			longest: "",
			errors: {},
			source: {},
			c_lm: 0,
			c_lb: 0,
			c_wt: 0,
			c_a: 0,
			c_b: 0,
			c_ver: 0,
			c_potwrong: 0,
			c_link_error: 0,
			c_github: 0,
			out_errors: {},
			total: resp.length
		};

		console.log("Processing mods...");
		Mod.processAllMods(stats, resp).then(function(res) {
			console.log("Done processing. Sorting...");
			var ret = res.sort(sort_by({name:'score', primer: parseInt, reverse: true}, 'basename'));

			var text = JSON.stringify(ret);
			fs.writeFileSync(settings.listfile, text);

			var text2 = JSON.stringify(stats.out_errors);
			fs.writeFileSync(settings.lookupfile, text2);

			console.log("Wrote " + ret.length + " entries to file.");
			console.log((stats.total - ret.length) + " out of " + stats.total + " entries weren't added.");
			var esum = 0;
			for (var key in stats.errors) {
				if (stats.errors.hasOwnProperty(key)) {
					console.log(" - " + stats.errors[key] + " " + key);
					esum += stats.errors[key];
				}
			}
			console.log(" - " + (stats.total - ret.length - esum)  + " unknown errors.");
			// console.log(" - " + stats.c_wt + " were not mods or modpacks in mod releases.");
			// console.log(" - " + stats.c_a + " had no author.");
			// console.log(" - " + stats.c_b + " failed to find a mod name / basename in their title.");
			// console.log(" - " + stats.c_lm + " had missing download/repo links.");
			// console.log(" - " + stats.c_lb + " had blacklisted download/repo links.");
			// console.log(" - " + stats.c_link_error + " had 404 or wrong content-type downloads.");
			console.log("Out of the added entries:");
			console.log(" - " + stats.c_ver + " were verified/trusted.");
			// console.log(" - " + (stats.total - not_added - stats.c_ver) + " were non-verified/untrusted.");
			console.log(" - " + stats.c_potwrong + " had downloads which didn't mention the modname.");
			var sum = 0;
			for (var key in stats.source) {
				if (stats.source.hasOwnProperty(key)) {
					var num_from_source = stats.source[key];
					console.log(" - " + num_from_source + " were from " + key);
					sum += num_from_source;
				}
			}
			console.log(" - " + (ret.length - sum) + " were from elsewhere");
			console.log("Wrote list to " + settings.listfile);
			if (settings.debugout != "") {
				console.log("Dumped debug out into " + settings.debugout + "/")
			}
			console.log("stats.longest desc is " + stats.min_size);
			console.log(stats.longest);
		}).catch(function(e) {
			console.log("Failed processing all mods: " + e)
		})

	});
}).on('error', function(e) {
	console.log("Got an error: ", e);
});
