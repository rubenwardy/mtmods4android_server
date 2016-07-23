"esversion: 6";

class RepoServer {
	getServerName() {}

	// Returns tupple: user, repo. Returns immediately
	getRepoFromURL(url) {}

	connect() {}

	getRepoURL(repo) {}

	// Returns a promise which will give you a description on completion
	getDescriptionFromRepo(repo) {}

	// Returns a promise which will give you depends.txt on completion
	getDependsFromRepo(repo) {}

	// Returns a promise which will give you a tuple: download link and hash
	getDownloadAndHash(repo, branch) {}
}

var fs = require('fs');
var Promise = require('bluebird');
var settings = JSON.parse(fs.readFileSync("settings.json", 'utf8'));


class GithubRepoServer extends RepoServer {
	getServerName() {
		return "github.com"
	}

	constructor() {
		super();
		this.github = null;
	}

	connect() {
		var GitHubApi = require("github");
		this.github = new GitHubApi({
		    // optional
		    debug: true,
		    protocol: "https",
		    host: "api.github.com", // should be api.github.com for GitHub
		    pathPrefix: "", // for some GHEs; none for GitHub
		    headers: {
		        "user-agent": "MtMods4Android Server" // GitHub is happy with a unique user agent
		    },
		    Promise: Promise,
		    followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
		    timeout: 5000
		});

		this.github.authenticate({
		    type: "oauth",
		    token: settings.github_auth
		});

		return true;
	}

	getRepoFromURL(link) {
		var re = /github.com\/([\w-]+)\/([\w-]+)/g;
		if (re) {
			var m = re.exec(link);
			if (m) {
				return {
					user: m[1],
					repo: m[2]
				};
			}
		} else {
			console.log("failed to compile");
		}
		return null;
	}

	getRepoURL(repo) {
		return "https://github.com/" + repo.user + "/" + repo.repo + ".git";
	}

	getDescriptionFromRepo(repo) {
		if (!this.github) {
			this.connect();
		}
		var me = this;
		return new Promise(function(resolve, reject) {
			me.github.repos.getContent({
				user: repo.user,
				repo: repo.repo,
				path: "description.txt"
			}).then(function(data) {
				if (data && data.content) {
					resolve(new Buffer(data.content, 'base64'));
				} else {
					reject();
				}
			});
		});
	}

	getDependsFromRepo(repo) {
		if (!this.github) {
			this.connect();
		}
		var me = this;
		return new Promise(function(resolve, reject) {
			me.github.repos.getContent({
				user: repo.user,
				repo: repo.repo,
				path: "depends.txt"
			}).then(function(data) {
				if (data && data.content) {
					resolve(new Buffer(data.content, 'base64'));
				} else {
					reject();
				}
			});
		});
	}

	getDownloadAndHash(repo, branch) {
		if (!this.github) {
			this.connect();
		}
		var me = this;
		return new Promise(function (resolve, reject) {
			var req = {
				user: repo.user,
				repo: repo.repo,
				per_page: 1
			};
			if (branch) {
				req.sha = branch;
			}
			me.github.repos.getCommits(req).then(function(res) {
				console.log(res);
				if (res && res.length == 1) {
					var sha = res[0].sha;
					resolve({
						link: "https://github.com/" + repo.user + "/" + repo.repo + "/archive/" + sha + ".zip",
						commit: sha
					});
				} else {
					reject();
				}
			});
		})

	}
}

// var reposerver = new GithubRepoServer();
// var repo = reposerver.getRepoFromURL("https://github.com/rubenwardy/awards.git");
// if (repo) {
// 	console.log("'" + repo.user + "' '" + repo.repo + "'");
// 	reposerver.connect();
// 	reposerver.getDownloadAndHash(repo, null).then(function(res) {
// 		var link = res.link;
// 		var commit = res.commit;
// 		console.log(link + " " + commit);
// 	});
// 	reposerver.getDescriptionFromRepo(repo).then(function(desc) {
// 		console.log("description: " + desc);
// 	});
// } else {
// 	console.log("Repo not from github");
// }

module.exports =  {
	RepoServer: RepoServer,
	GithubRepoServer: GithubRepoServer
}
