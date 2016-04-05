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

var fs = require('fs');
var url = require("url");
var http = require("http");
var https = require("https");
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
var list = JSON.parse(fs.readFileSync(settings.listfile, 'utf8'));
var cachefile = JSON.parse(fs.readFileSync("data/url_result_cache.json", 'utf8'));
var running = 0;

function make_head_request(item) {
	if (item.follows != null) {
		item.follows++;
	} else {
		item.follows = 0;
		item.orig = item.link;
	}

	var et = cachefile[item.orig];
	if (et) {
		return false;
	}

	running++;

	try {
		var options = url.parse(item.link);
		options.method = "HEAD";
		options.rejectUnauthorized = false;
		var ht = http;
		if (options.protocol && options.protocol.indexOf("https") >= 0) {
			ht = https;
		}

		var req = ht.request(options, function(res) {
			running--;

			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				if (item.follows > 3) {
					console.log("Too many redirects!");
					add_url(item, res.statusCode, 0);
					res.abort();
					return;
				}
				console.log(item.link + " -> " + res.headers.location);
				item.link = res.headers.location;
				make_head_request(item);
			} else if (res.statusCode == 405) {
				make_get_request(item);
			} else {
				var size = res.headers["content-length"];
				console.log(item.link + "\t" + res.statusCode + "\t" + res.headers["content-type"]);
				console.log(item.orig);

				if (
						res.statusCode == 200 &&
						(res.headers["content-type"].indexOf("zip") >= 0 ||
						res.headers["content-type"].indexOf("application/octet-stream") >= 0)) {
					add_url(item,  res.statusCode, size);
				} else {
					add_url(item, (res.statusCode == 200) ? -1 : res.statusCode, size);
				}
			}
		});
		req.end();
	} catch (e) {
		running--;
		console.log(e);
	}

	return true;
}

function make_get_request(item) {
	running++;

	try {
		var options = url.parse(item.link);
		options.rejectUnauthorized = false;
		var ht = http;
		if (options.protocol && options.protocol.indexOf("https") >= 0) {
			ht = https;
		}
		var req = ht.request(options, function(res) {
			running--;

			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				if (item.follows > 3) {
					console.log("Too many redirects!");
					add_url(item, res.statusCode, 0, true);
					res.abort();
					return;
				} else {
					console.log(item.link + " -> " + res.headers.location);
					item.link = res.headers.location;
					make_get_request(item);
				}
			} else {
				var size = 0;
				res.on("data", function(data) {
					size += data.length;
				});
				res.on("end", function() {
					console.log(item.link + "\t" + res.statusCode + "\t" + res.headers["content-type"]);
					console.log(item.orig);

					if (
							res.statusCode == 200 &&
							(res.headers["content-type"].indexOf("zip") >= 0 ||
							res.headers["content-type"].indexOf("application/octet-stream") >= 0)) {
						add_url(item, res.statusCode, size, true);
					} else {
						add_url(item, (res.statusCode == 200) ? -1 : res.statusCode, size, true);
					}
				});

			}
		});
		req.end();
	} catch (e) {
		running--;
		console.log(e);
	}
}


function add_url(item, status, size, no_rec) {
					console.log(size);
	if (size == null && !no_rec && status == 200) {
		make_get_request(item);
	} else {
		cachefile[item.orig] = {
			status: Number(status),
			timestamp: new Date().getTime(),
			final_url: item.link,
			size: Number(size)
		};
	}
}

var pointer = 0;

function update() {
	console.log("Saving...\n");
	var text = JSON.stringify(cachefile, null, 4);
	fs.writeFileSync("data/url_result_cache.json", text);

	if (running > 10) {
		console.log("Started 0. " + running + " running. Now at " + pointer + " / " + list.length + "\n");
	} else if (pointer < list.length) {
		var c = 0;
		while (pointer < list.length && c < 5) {
			if (make_head_request(list[pointer])) {
				c++;
			}
			pointer++;
		}
		console.log("Started " + c + ". " + running + " running. Now at " + pointer + " / " + list.length + "\n");
	}

	if (pointer < list.length || running > 0) {
		setTimeout(update, 100);
	} else {
		console.log("Stop!\n");
	}

}
update();
