# Nodejs-MtMods4Android

LGPL 2.1 or later.

Two parts:

1. NodeJS server
2. List update scripts

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
