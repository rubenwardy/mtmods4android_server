var Sequelize = require("sequelize");
var async = require("async");

var sequelize = new Sequelize("database", "", "", {
  dialect: "sqlite",
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },

  // SQLite only
  storage: "data/db.sqlite"
});

var User = sequelize.define("user", {
	username: Sequelize.STRING(100)
});

var Mod = sequelize.define("mod", {
	name: Sequelize.STRING(100),
	short_desc: Sequelize.STRING(100),
	desc: Sequelize.STRING(900),
	repo: Sequelize.STRING(250)
});
Mod.belongsTo(User);

var Version = sequelize.define("mod_version", {
	title: Sequelize.STRING(100),
	download: Sequelize.STRING(250),
	hash: Sequelize.STRING(256),
	size: Sequelize.INTEGER,
	approved: Sequelize.BOOLEAN
});
Version.belongsTo(Mod);

async.parallel([
	function(callback) { User.sync().then(callback); },
	function(callback) { Mod.sync().then(callback); },
	function(callback) { Version.sync().then(callback); }],
function() {
	User.findOrCreate({
		where: {
			username: "rubenwardy"
		},
		defaults: {}
	}).then(function(user) {
		Mod.findOrCreate({
			where: {
				name: "awards"
			},
			defaults: {
				short_desc: "Adds awards to Minetest",
				desc: "Adds awards to Minetest. Also adds an API.",
				repo: "https://github.com/minetest-mods/awards/",
				userId: user.id
			}
		}).then(function(mod) {
			Version.findOrCreate({
				where: {
					title: "v0.1"
				},
				defaults: {
					download: "https://github.com/minetest-mods/awards/archive/master.zip",
					hash: "SKDNFK4D4NR95NR94NEK49NR9494943",
					size: 1024,
					approved: true,
					modId: mod.id
				}
			});
		});
	});
});
