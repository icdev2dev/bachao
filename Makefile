npm:
	npm install --no-optional

test: npm
	npm run test

html:
	git rev-parse --verify --short HEAD > version.txt
	./node_modules/browserify/bin/cmd.js bachao.js --standalone ssss -o bundle.js
	./node_modules/preprocessor/bin/preprocess bachao_template.html > bachao.html
	rm -f bundle.js
	rm -f version.txt

all: test html

.DEFAULT_GOAL := all
.PHONY: all test npm
