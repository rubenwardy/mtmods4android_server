var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var expressLiquid = require("express-liquid");
var responseTime = require('response-time');
var model = require("./model");
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
	res.redirect("https://content.minetest.net/");
});

app.get("/download/:author/:modname", function(req, res) {
	res.redirect("https://content.minetest.net/packages/" + req.params.author + "/" + req.params.name + "/download/");
});

app.get("/screenshot/:author/:modname", function(req, res) {
	var mods = model.get();
	for (var i = 0; i < mods.length; i++) {
		var mod = mods[i];
		if (mod.author == req.params.author && mod.basename == req.params.modname) {
			if (mod.thumbnail) {
				res.redirect(mod.thumbnail.replace("thumbnails/1/", "thumbnails/3/"))
			} else {
				res.status(404).send("Unable to find screenshot");
			}
			return;
		}
	}
	res.status(404).send("Unable to find mod");
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

app.get("/v2/list", function (req, res) {
	res.send(model.get());
});

app.post("/v1/on-download", function(req, res) {
	res.end("OK");
});

app.post("/v1/report", function(req, res) {
	res.end("OK");
});

app.listen(8080, "127.0.0.1", function () {
	console.log("node-mtmods4android listening on port 8080!");
});
