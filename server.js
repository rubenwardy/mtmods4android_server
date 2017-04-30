var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var expressLiquid = require("express-liquid");
var responseTime = require('response-time');
var model = require("./common/model");
var apicache = require("apicache").options({ debug: false }).middleware;

var app = express();
app.use(responseTime());
app.use( bodyParser.json() );	   // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({	 // to support URL-encoded bodies
	extended: true
}));
var options = {
	// read file handler, optional
	includeFile: function (filename, callback) {
		var fs = require("fs");
		fs.readFile(filename, "utf8", callback);
	},
	// the base context, optional
	context: expressLiquid.newContext(),
	// custom tags parser, optional
	customTags: {},
	// if an error occurred while rendering, show detail or not, default to false
	traceError: false
};
app.set("view engine", "liquid");
app.engine("liquid", expressLiquid(options));
app.use(expressLiquid.middleware);

app.get("/", function (req, res) {
	res.render("index", {title: "Mod Developer Panel", mods: model.getPopularMods()});
});

app.get("/status", function (req, res) {
	var author = (req.query.a) ? req.query.a.trim().toLowerCase() : "";
	var mods = model.getAuthorModStatuses(author);

	// Error Message
	var error = null;
	if (!mods) {
		if (!req.query.a) {
			error = "Please enter a forum username";
		} else {
			error = "Unable to find your mods. Are you sure that you've typed your forum name correctly?";
		}
	}
	res.render("status", {title: author, author: author, mods: mods, error: error});
});

app.get("/mods", function (req, res) {
	if (req.headers.accept.indexOf("application/vnd.minetest.mmdb-v1+json") >= 0) {
		var list = model.getListNoReports();
		var ret = [];

		for (var i = 0; i < list.length; i++) {
			var mod = list[i];
			ret.push({
				id: i,
				title: mod.title || mod.basename,
				basename: mod.basename,
				author: mod.author,
				value: 0,
				version_set: [{
					id: 0,
					date: 0,
					file: "download/" + mod.author + "/" + mod.basename + "/"
				}]
			});
		}

		res.header("Content-Type", "application/vnd.minetest.mmdb-v1+json");
		res.send(ret);
	} else {
		var q = (req.query.q) ? req.query.q.trim().toLowerCase() : "";
		var mods = [];
		var tmp = model.getList();
		if (q == "") {
			mods = tmp;
		} else {
			for (var i = 0; i < tmp.length; i++) {
				var mod = tmp[i];
				if (mod.basename.indexOf(q) >= 0 || mod.author.indexOf(q) >= 0 ||
						mod.title.indexOf(q) >= 0 ||
						(mod.description && mod.description.indexOf(q) >= 0)) {
					mods.push(mod);
				}
			}
		}

		// Error Message
		var error = null;
		if (!mods) {
			if (!req.query.a) {
				error = "Please enter a forum username";
			} else {
				error = "Unable to find your mods. Are you sure that you've typed your forum name correctly?";
			}
		}
		res.render("mods", {title: "Search " + q, mods: mods, search: q});
	}
});

app.get("/mod/:modname", function (req, res) {
	var mod = model.getMod(req.params.modname);
	if (mod != null && mod.id >= 0) {
		res.send({
			id: mod.id,
			title: mod.title || mod.basename,
			basename: mod.basename,
			desc: mod.description || "",
			author: {
				id: 0,
				username: mod.author
			},
			replink: mod.download_link,
			depends: mod.depends || [],
			softdep: mod.soft_depends || [],
			value: 0,
			titlepic: "",
			date: 0,
			reports: "",
			version_set: [{
				id: 0,
				date: 0,
				file: "download/" + mod.author + "/" + mod.basename + "/"
			}],
			download_url: "download/" + mod.author + "/" + mod.basename + "/"
		});
	} else {
		console.log(req.originalUrl);
		res.status(404).send("Not found");
	}
});

app.get("/download/:author/:modname", function(req, res) {
	var author = req.params.author;
	var modname = req.params.modname;
	var mod = model.getMod(modname, author);

	if (mod) {
		console.log("Redirecting to download at " + mod.download_link);
		res.redirect(mod.download_link);
	} else {
		res.status(404).send("Not found");
	}
});

app.get("/screenshot/:author/:modname", function(req, res) {
	var author = req.params.author;
	var modname = req.params.modname;
	var mod = model.getMod(modname, author);

	if (mod && mod.repo_host == "github.com") {
		var url = "https://raw.githubusercontent.com/" + mod.repo_author + "/" + mod.repo_name + "/master/screenshot.png";
		console.log("Redirecting to screenshot at " + url);
		res.redirect(url);
	} else {
		res.status(404).send("Not found");
	}
});

app.get("/blacklist", function (req, res) {
	res.render("blacklist", {title: "Blacklist", links: model.getBlacklist()});
});

app.get("/verified", function (req, res) {
	res.render("verified", {title: "Verified", links: model.getVerified()});
});

app.post("/v2/notify-mod-update", function(req, res) {
	if (req.body && req.body.repository && req.body.repository.full_name) {
		fs.appendFileSync("data/updates.txt", req.body.repository.full_nam + "\n");
		res.send("OK");
	} else {
		res.status(400).end("bad-request");
	}
});

app.post("/v2/on-missing-dep", function(req, res) {
	var fs = require("fs");
	var mods = req.body.mods;

	for (var i = 0; i < mods.length; i++) {
		var mod = mods[i];
		fs.appendFileSync("data/missing_depends.txt", mod + "\n");
	}

	res.send("OK");
});

app.get("/v2/list", apicache("5 minutes"), function (req, res) {
	res.send([
		{
			"topicId":"14280",
			"author":"rubenwardy",
			"type":"1",
			"title":"Configuration error!",
			"link":"",
			"score":0,
			"name":"configuration_error",
			"verified":1,
			"size":0,
			"description":"Please complain to rubenwardy, he messed up",
			"depends":["monoidal_effects"],
			"soft_depends":["3d_armor"]
		}
	]);
});

app.get("/v3/list", apicache("5 minutes"), function (req, res) {
	res.send(model.getMinimalList());
});

app.get("/v1/list", apicache("5 minutes"), function (req, res) {
	res.send(model.getOldList());
});

app.post("/v1/on-download", function(req, res) {
	var fs = require("fs");
	var modname = req.body.modname;
	var link	= req.body.link;
	var size	= req.body.size;
	var respcode  = req.body.status;
	var author  = req.body.author || "";
	var error = req.body.error || "";

	fs.appendFileSync("data/downloads.txt", respcode + "\t" + size + "\t" + author + "\t" + modname + "\t" + link + "\t" + error + "\n");
	res.end("OK");
});

app.post("/v1/report", function(req, res) {
	var msg	 = req.body.msg || "";
	msg		 = msg.replace("\n", "\\n").replace("\r", "\\r");

	var report = {
		type: req.body.reason || "other",
		author: req.body.author,
		modname: req.body.modname,
		list: req.body.list,
		link: req.body.link || "",
		msg: msg
	};

	if (model.report(report)) {
		res.end("OK");
	} else {
		res.end("bad-request");
	}
});

app.listen(8080, "127.0.0.1", function () {
	console.log("node-mtmods4android listening on port 8080!");
});
