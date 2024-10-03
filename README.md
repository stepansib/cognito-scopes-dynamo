# AWS Cognito OAuth Scopes Configuration DynamoDB Storage PoC

## Table of contents

- [Description](#description)
- [Architecture design](#architecture-design)
- [How to use](#how-to-use)
  - [Prepare](#prepare)
  - [Deploy](#deploy)
  - [Evaluate](#evaluate)
  - [Customize](#customize)
  - [Cleanup](#cleanup)
  - [Contribute](#contribute)

## Description

Work in progress...

## Architecture design

Work in progress...

## How to use

### Prepare

- Install [Node Version Manager](https://github.com/nvm-sh/nvm) globally
- Clone the repository and navigate to the root folder
- Run `nvm use` command to switch (and optionally download) to required Node.js version
- Run `npm install` command to install all the project dependencies
- Copy `.env.dist` file to `.env` and populate AWS account credentials
- (optional) [Setup pre-commit hook](#contribute)

### Deploy

- Run `npm run deploy` command to deploy CF stack to configured AWS account

### Evaluate

Work in progress...

### Customize

Work in progress...

### Cleanup

- Run `npm run remove` command to remove CF stack from configured AWS account

### Contribute

- [Clone and setup project](#prepare)
- To follow ESLint and Prettier rules setup husky pre-commit hook by running the following command:
  `npx husky init && echo "lint-staged && npm run build" > .husky/pre-commit`
- Follow [Conventional Commits](https://www.conventionalcommits.org/) naming rules