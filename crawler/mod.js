class Mod {
	constructor(author) {
		this.author = author || null;
		this.basename = null;
		this.description = "";
		this.forum_url = null;
		this.download_link = null;

		this.repo_host = null;
		this.repo = null;
		this.commit_hash = null;
	}

	extractInfoFromTitle(title) {
		// Get modname
		var re = /\[(.+?)\]/g;
		var basename = null;
		var m;
		do {
			m = re.exec(title);
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
		this.basename = basename;
	}

	getFirstProblem() {
		if (!this.author) {
			return "needs forum author name";
		} else if (!this.basename) {
			return "needs basename";
		} else if (!this.download_link) {
			return "needs download link";
		} else {
			return null;
		}
	}

	toPlainDictionary() {
		function isFunction(obj) {
			return !!(obj && obj.constructor && obj.call && obj.apply);
		}

		var res = {};
		for (var key in this) {
			if (this.hasOwnProperty(key) && !isFunction(this[key])) {
				res[key] = this[key];
			}
		}
		console.log(res);
		return res;
	}
}

module.exports = Mod;
