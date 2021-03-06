
REPORTER ?= dot
BIN = ./node_modules/.bin
TESTS = $(wildcard test/-test.js)
LIB = $(wildcard lib/.js)

# test commands 

clean:
	@rm -f $(GENERATE)

lint:
	./node_modules/.bin/jshint --config ./.jshintrc ./model/*.js
	#./node_modules/.bin/jshint --config ./.jshintrc ./controllers/*.js

test:
	echo "Tests are disabled"
	#echo "Mocha will test files in test/*-test.js"
	#./node_modules/mocha/bin/mocha --timeout 30000 --colors $(TESTS)
	#make clean && \
	##make lint && \
	#--reporter $(REPORTER) \
	#test/handlebars-async.test.js
install link:
	@npm $@

define release
	VERSION=`node -pe "require('./package.json').version"` && \
	NEXT_VERSION=`node -pe "require('semver').inc(\"$$VERSION\", '$(1)')"` && \
	node -e "\
	var j = require('./package.json');\
	j.version = \"$$NEXT_VERSION\";\
	var s = JSON.stringify(j, null, 2);\
	require('fs').writeFileSync('./package.json', s);" && \
	git commit -m "release v$$NEXT_VERSION" -- package.json && \
	git tag "v$$NEXT_VERSION" -m "release v$$NEXT_VERSION"
endef

release-patch: test
	@$(call release,patch)

release-minor: test
	@$(call release,minor)

release-major: test
	@$(call release,major)

publish:
	git push --tags origin HEAD:master
	npm publish


.PHONY: clean lint test
