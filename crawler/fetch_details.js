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
var http = require("https");
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
var list = JSON.parse(fs.readFileSync(settings.listfile, 'utf8'));
var db = JSON.parse(fs.readFileSync("data/db.json", 'utf8'));
var token = settings.github_auth;
var running = 0;

function runOn(item) {
	var id = item.author.toLowerCase() + "/" + item.name.toLowerCase();
	if (db[id]) {
		console.log("Skipping " + id);
		return;
	}
	//console.log("Starting " + id);

	function findTwo(link, re) {
		if (!re) {
			console.log("failed to compile");
			return null, null;
		}
		var m = re.exec(link);
		if (m) {
			return [m[1], m[2]];
		}
		return [null, null]
	}

	var filters = [
		{re: /github.com\/([\w-]+)\/([\w-]+)/g,    out: "/repos/{0}/{1}/contents/description.txt"} //"https://raw.githubusercontent.com/{0}/{1}/master/description.txt"},
		//	{re: /bitbucket.org\/([\w-]+)\/([\w-]+)/g, out: "https://bitbucket.org/{0}/{1}/raw/18449ee6b6db4e650e3554d2c81164d1ab243058/description.txt"},
	];

	for (var j = 0; j < filters.length; j++) {
		var fil = filters[j];
		var ret = findTwo(item.link, fil.re);
		var author = ret[0];
		var repo = ret[1];
		if (author && repo) {
			running++;
			var url = fil.out.format(author, repo);

			http.get({
			    host: 'api.github.com',
			    path: url,
			    method: 'GET',
			    headers: {'user-agent': 'node.js', 'Authorization': "Bearer " + token},
			}, function(res) {
				if (res.statusCode !== 200) {
					running--;
					console.log(author + "/" + repo + ": " + res.statusCode);

					var body = '';
					res.on('data', function(chunk) {
						body += chunk;
					});

					res.on('end', function() {
						console.log(author + "/" + repo + ": " + res.statusCode + ": " + body);
					});

					return;
				}

				var body = '';

				res.on('data', function(chunk) {
					body += chunk;
				});

				res.on('end', function() {
					var id = item.author.toLowerCase() + "/" + item.name.toLowerCase();

					running--;
					if (body.trim() == "") {
						console.log("Empty result from " + id);
						return;
					}

					var data = JSON.parse(body);
					console.log("Got " + item.name + ": '" + body + "'");
					if (!data || data.message == "Not Found") {
						console.log("Empty result from " + id);
						return;
					}
					body = new Buffer(data.content, 'base64'); // Ta-da


					if (!db[id])
						db[id] = {}

					db[id].description = body.toString();
				});
			}).on('error', function(e) {
				running--;
				console.log("Got an error: ", e);
			});

			console.log("Polling " + id + ": " + item.link);

			return true;
		} else {
			console.log("No match on " + id + ": " + item.link);
		}
	}

	return false;
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
