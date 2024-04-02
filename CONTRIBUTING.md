## What is `astro-theme-provider`?

`astro-theme-provider` is a tool for creating itegrations that inject pages/assets into a project

### Why?

The main practice for creating themes is to create a template that can be clonned and edited, but this has some problems:

- Hard to update: merging improvements from a template repo can be quite hard after editing and customizing the theme
- Not beginner friendly: the main demographic for theme users are people new to Astro and web development in general, cloning and editing a theme as a beginner can be challenging
- No standard: every theme is different, for example: many themes have some sort of `config.ts` file to customize the theme but there is no standard for this and every theme uses a different pattern and structure

`astro-theme-provider` attempts to provide a new way of creating themes that fixes these issues

### Core Goals

- Inject configurable pages and assets into projects using an integration
- Provide/create integrations without having to write any integration code
- Provide APIs to override theme pages and assets when using a theme
- Install theme integrations using a single command `astro add my-theme`
- Typesafe configurations, imports/modules, etc
- Work in any enviroment

## Contibuting to `astro-theme-provider`

### How can I contribute?

There are many ways to contribute and many of them do not involve code, giving feedback and asking questions helps *a lot*! Some ways you can help contribute are:

- Participate in discussions in the ~Discord Channel~?, Issues Tab, and Dicussions Tab?
- Use `astro-theme-provider`, give feedback about your experience and suggestions for improvments or enhancments
- Test `astro-theme-provider`, try to break it and open an issue for any bugs you find
- Take ownership of an issue tagged `help wanted`, this can be anything from a bug fix to an enhancement for the project

### Repo Structure

```
docs        // starlight website for documentation
package/
├── src     // `astro-theme-provider` package code
└── tests   // Unit tests for package code
playground  // Playground for testing changes
tests/
├── e2e     // e2e tests using playwright
└── themes
    ├── theme-playground // test theme used inside of playground
    └── ...
```

### Setting up local repo

> **Note**: This repo uses ***pnpm***, you must use ***pnpm*** as your package manager

1. Clone the repo locally

```
git clone ...
```

2. Install dependencies

```
pnpm i
```

3. Install browsers for testing

```
pnpm exec playwright install --with-deps
```

4. Build the package

Watch mode:

```
pnpm package:dev
```

Build once:

```
pnpm package:build
```

Now that the repo has been setup and the package has been built, you can use `pnpm test` to test your changes and use `pnpm playground:dev` to play around with your changes

### PRs

- Use the command `pnpm lint:fix` to lint your PR
- Use the command `pnpm changeset` to add a changeset to your PR


### Commands

| Command                   | Action                                                 |
| :------------------------ | :----------------------------------------------------- |
| `pnpm test`               | run all tests                                          |
| `pnpm test:unit`          | run unit tests                                         |
| `pnpm test:e2e`           | run e2e tests using playwright                         |
| `pnpm package:dev`        | build the `astro-theme-provider` package in watch mode |
| `pnpm package:build`      | build the `astro-theme-provider` package using `tsup`  |
| `pnpm playground:dev`     | run the dev server for the playground                  |
| `pnpm playground:build`   | build the playground project                           |
| `pnpm docs:dev`           | run dev server for docs                                |
| `pnpm docs:build`         | build docs project`                                    |
| `pnpm lint`               | lint                                                   |
| `pnpm lint:fix`           | apply lint                                             |
| `pnpm changeset`          | create a changeset for your changes                    |