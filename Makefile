SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)

lib: $(LIB)
lib/%.js: src/%.js
	@mkdir -p $(@D)
	./node_modules/.bin/babel $< -L all -b regenerator,es6.constants -o $@

include node_modules/make-lint-es6/index.mk

