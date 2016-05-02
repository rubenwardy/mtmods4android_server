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
var filefetch = require("./filefetch");
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
var list = JSON.parse(fs.readFileSync(settings.listfile, 'utf8'));
var db = JSON.parse(fs.readFileSync("data/db.json", 'utf8'));
var running = 0;

function propertyFromFile(item, file, property, success) {
	var id = item.author.toLowerCase() + "/" + item.name.toLowerCase();
	//if (db[id] && db[id][property]) {
	//	return false;
	//}

	if (filefetch.from_link(item.link, file,
			function(res, body, url) {
				running--;

				var id = item.author.toLowerCase() + "/" + item.name.toLowerCase();
				console.log("Got " + item.name + ": '" + body + "'");
				if (!db[id]) {
					db[id] = {}
				}
				db[id][property] = body.toString();

				if (success) {
					success(res, body);
				}
			},
			function(res, body, url) {
				running--;
				console.log(url + ": " + res.statusCode + ": " + body)
			})) {
		running++;
		return true;
	} else {
		return false;
	}
}

function runOn(item) {
	return propertyFromFile(item, "depends.txt", "depends", function(res, body) {
		var id = item.author.toLowerCase() + "/" + item.name.toLowerCase();
		var dep_string = db[id].depends;
		var all_depends = dep_string.split("\n");
		db[id].depends = [];
		db[id].soft_depends = [];
		for (var i = 0; i < all_depends.length; i++) {
			var dep = all_depends[i].trim();
			if (dep != "") {
				if (dep[dep.length - 1] == '?') {
					db[id].soft_depends.push(dep.slice(0, -1));
				} else {
					db[id].depends.push(dep);
				}
			}
		}
	});// && propertyFromFile(item, "description.txt", "description");
}

var pointer = 0;

function update() {
	var text = JSON.stringify(db, null, 4);
	fs.writeFileSync("data/db.json", text);

	if (running > 10) {
		console.log("Started 0. " + running + " running. Now at " + pointer + " / " + list.length + "\n");

		if (pointer < list.length)
			setTimeout(update, 2000);

		return
	}
	var c = 0;
	while (pointer < list.length && c < 5) {
		if (runOn(list[pointer]))
			c++;
		pointer++;
	}
	console.log("Started " + c + ". " + running + " running. Now at " + pointer + " / " + list.length + "\n");

	if (pointer < list.length)
		setTimeout(update, 1);

}
update();
