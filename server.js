var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressLiquid = require('express-liquid');
var model = require('./model');
var apicache = require('apicache').options({ debug: false }).middleware;

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
var options = {
  // read file handler, optional
  includeFile: function (filename, callback) {
    var fs = require('fs');
    fs.readFile(filename, 'utf8', callback);
  },
  // the base context, optional
  context: expressLiquid.newContext(),
  // custom tags parser, optional
  customTags: {},
  // if an error occurred while rendering, show detail or not, default to false
  traceError: false
};
app.set('view engine', 'liquid');
app.engine('liquid', expressLiquid(options));
app.use(expressLiquid.middleware);

app.get('/', function (req, res) {
    res.render('index', {title: "Mod Developer Panel", mods: model.getPopularMods()});
});

app.get('/status', function (req, res) {
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
    res.render('status', {title: author, author: author, mods: mods, error: error});
});

app.get('/mods', function (req, res) {
    if (req.headers.accept.indexOf("application/vnd.minetest.mmdb-v1+json") >= 0) {
        var list = model.getListNoReports();
        var ret = [];

        for (var i = 0; i < list.length; i++) {
            var mod = list[i];
            ret.push({
                id: i,
                title: mod.title || mod.name,
                basename: mod.name,
                author: mod.author,
                value: 0,
                version_set: 0
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
                if (mod.name.indexOf(q) >= 0 || mod.author.indexOf(q) >= 0 ||
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
        res.render('mods', {title: "Search " + q, mods: mods, search: q});
    }
});

app.get('/mod/:modname', function (req, res) {
    var modname = req.params.modname;
    var mod = model.getMod(modname);
    if (mod != null) {
        res.send({
            id: mod.id || -1,
            title: mod.title || mod.name,
            basename: mod.name,
            desc: mod.description || "",
            author: mod.author,
            replink: mod.link,
            depends: mod.depends || [],
            softdep: mod.soft_depends || [],
            value: 0,
            titlepic: "",
            date: 0,
            reports: "",
            version_set: 0,
            download_url: "download/" + mod.author + "/" + mod.name
        });
    } else {
        res.end("404");
    }
});

app.get("/download/:author/:modname", function(req, res) {
    var author = req.params.author;
    var modname = req.params.modname;
    var mod = model.getMod(modname);

    res.redirect(mod.link);
});

app.get('/blacklist', function (req, res) {
    res.render('blacklist', {title: "Blacklist", links: model.getBlacklist()});
});

app.get('/verified', function (req, res) {
    res.render('verified', {title: "Verified", links: model.getVerified()});
});

app.get('/v1/list', apicache('5 minutes'), function (req, res) {
    res.send(model.getList());
});

app.post('/v1/on-download', function(req, res) {
    var fs = require("fs");
    var modname = req.body.modname;
    var link    = req.body.link;
    var size    = req.body.size;
    var respcode  = req.body.status;
    var author  = req.body.author || "";
    var error = req.body.error || "";

    fs.appendFileSync("downloads.txt", respcode + "\t" + size + "\t" + author + "\t" + modname + "\t" + link + "\t" + error + "\n");
    res.end("OK");
});

app.post('/v1/report', function(req, res) {
    var msg     = req.body.msg || "";
    msg         = msg.replace("\n", "\\n").replace("\r", "\\r");

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
    console.log('node-mtmods4android listening on port 8080!');
});
