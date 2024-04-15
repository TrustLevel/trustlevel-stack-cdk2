# required for process substitution in bundling target
SHELL := /bin/zsh

.PHONY: bundle help

bundle:
	@echo "Bundling application..."
	@rm -rf _build
	@pipenv run pip install -r <(pipenv run pip freeze) --target _build/
	@rsync -a . _build --exclude _build
	@cd _build && zip -r ../content-score-api.zip .

help:
	@echo "Available targets:"
	@echo "  bundle - Bundles the application to be deployed as a Lambda function."

.DEFAULT_GOAL := help