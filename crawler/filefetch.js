var http = require("https");
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));
var token = settings.github_auth;

function github_fetch(url, success, error)
{
	console.log("Polling " + url);
	http.get({
		host: 'api.github.com',
		path: url,
		method: 'GET',
		headers: {'user-agent': 'node.js', 'Authorization': "Bearer " + token},
	}, function(res) {
		if (res.statusCode !== 200 && (res.statusCode < 300 || res.statusCode >= 400)) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});

			res.on('end', function() {
				error(res, body, url);
			});

			return;
		}

		var body = '';

		res.on('data', function(chunk) {
			body += chunk;
		});

		res.on('end', function() {
			if (body.trim() == "") {
				error(res, body, url);
				return;
			}

			var data = JSON.parse(body);
			if (res.statusCode == 200) {
				if (!data || data.message == "Not Found") {
					error(res, body, url);
				} else {
					body = new Buffer(data.content, 'base64'); // Ta-da
					success(res, body, url);
				}
			} else {
				console.log(url + " -> " + data.url);
				github_fetch(data.url, success, error);
			}
		});
	}).on('error', function(e) {
		console.log("Got an error: ", e);
		error({
			statusCode: -1
		}, e, url);
	});
}

function github(username, repo, filepath, success, error) {
	github_fetch("/repos/" + username + "/" + repo + "/contents/" + filepath, success, error);
}

function from_link(url, filepath, success, error) {
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

	// Get author and repo from github url
	var ret = findTwo(url, /github.com\/([\w-]+)\/([\w-]+)/g);
	var author = ret[0];
	var repo = ret[1];
	if (author && repo) {
		github(author, repo, filepath, success, error);
		return true;
	} else {
		return false;
	}
}

module.exports = {
	github: github,
	from_link: from_link
}
