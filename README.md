# Nodejs-MtMods4Android

![build unknown](https://img.shields.io/badge/build-unknown-lightgrey.svg)
![coverage](https://img.shields.io/badge/coverage-NaN%25-red.svg)
![node](https://img.shields.io/npm/v/npm.svg)
![style](https://img.shields.io/badge/style-linuxish-brightgreen.svg)
![downloads](https://img.shields.io/badge/downloads-1%20\(me\)-red.svg)

Here be dragons. Prototype server, needs to be rewritten or redesigned.

**License:** LGPL 2.1 or later.

Two parts:

1. NodeJS server (`server.js`, `models/model.js`)
2. List update scripts (`crawler/`)

# Setup

	# Build list
	cd crawler
	mkdir out
	cp settings.json.example settings.json
	nodejs update.js

	# Install dependencies
	cd ../
	npm install

	# Setup Node Environment
	export NODE_ENV=development
	# or for production
	export NODE_ENV=production


# Run server

	nodejs server

I suggest using pm2

# Run crawler

	cd crawler
	nodejs update.js
	nodejs check_urls.js
	nodejs fetch_details.js
	nodejs update.js
	cd ../
