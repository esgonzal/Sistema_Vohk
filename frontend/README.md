# VÖHK Angular workspace

This workspace contains two independent Angular applications:

- `vohk`: the original TTLock administration site in `src/`.
- `vohk-one`: the new condominium administration site in `projects/vohk-one/`.

## Development server

- Run `npm run start:legacy` for the original site at `http://localhost:4200/`.
- Run `npm run start:one` for the new site at `http://localhost:4201/`.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

- `npm run build:legacy` outputs to `dist/vohk/`.
- `npm run build:one` outputs to `dist/vohk-one/`.
- `npm run build:all` builds both applications.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
