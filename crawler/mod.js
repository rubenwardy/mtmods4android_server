class Mod {
	constructor(author) {
		this.author = author || null;
		this.type = "1";
		this.basename = null;
		this.title = null;
		this.description = "";
		this.forum_url = null;
		this.download_link = null;

		this.repo_host = null;
		this.repo = null;
		this.commit_hash = null;
	}

	extractInfoFromTitle(title) {
		this.title = title;

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

		if (basename) {
			this.basename = basename.toLowerCase();
			this.title = title.replace("[" + basename + "]", "")
				.replace("  ", " ").replace("  ", " ").replace("&#58;", ":")
				.replace("&#39;", "'").trim();
		}
	}

	getFirstProblem() {
		if (!this.author) {
			return "needs forum author name";
		} else if (!this.basename) {
			return "needs basename";
		} else if (!this.title) {
			return "needs title (this should never happen)";
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
		return res;
	}

	getScore() {
		return (this.description.length > 5) ? 5 : 0;
	}
}

console.log(new Date(1469294101* 1000));

module.exports = Mod;
