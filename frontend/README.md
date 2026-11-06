# Sistema VÖHK frontend

This directory contains the Angular application served at `https://app.vohk.cl`. It uses the legacy `/v0` API routes from `Sistema_Vohk/backend`.

The application served at `https://one.vohk.cl` is maintained separately in the `vohk_one_web` repository and must not be added to this workspace.

## Runtime requirement

Use **Node.js 22.16.0** and **npm 10.9.2**. From the repository root, `nvm use 22.16.0` selects the version declared in `.nvmrc`.

## Development server

Run `npm start` to serve the application at `http://localhost:4200/`.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build`. The production output is written to `dist/vohk/`.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
