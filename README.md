[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

# Trustlevel-Webstack

Contains trustlevel components linked together using [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

# Execution (top level)

```bash
# install and link all dependencies
yarn install

# prettify/lint all projects
yarn run fix
```

# Deployment

Find deployment instructions here:
[Cdk deployment](/workspaces/cdk/README.md)

# Trustlevel Api

Once the stack is deployt, you can call the trustlevel api as follows:

1. Copy the text you want to determine the `trustlevel` for
2. Escape the text so that you can paste it into a json attribute (here are some example tools that do the work for you: [online formatter](https://www.freeformatter.com/json-escape.html#before-output) or [jq](https://jqlang.github.io/jq/))
3. Call the trustlevel api (curl example):

    ```bash
    curl --location 'https://<stage-url>/v1/trustlevels/' \
    --header 'Content-Type: application/json' \
    --header 'x-api-key: <stage-api-key>' \
    --data '{
        "text": "<your-escaped-text>"
    }'
    ```