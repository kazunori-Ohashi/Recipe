.PHONY: test-unit test-int test-workflow test-e2e lint setup

setup:
	npm install

echo:
	echo "Recipe pipeline"

test-unit:
	npm run test:unit

test-int:
	npm run test:int

test-workflow:
	npm run test:workflow

test-e2e:
	npm run test:e2e

lint:
	npm run lint
