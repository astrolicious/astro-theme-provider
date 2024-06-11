## What is `astro-theme-provider`?

Astro Theme Provider is a tool that allows you to author themes for [Astro](https://astro.build/) like a normal project and export your work as an integration for others to use.

### Core Goals

- Inject configurable pages and assets into projects using an integration
- Provide/create integrations without having to write any integration code
- Provide APIs for theme users to override pages and assets
- Install theme integrations using a single command `astro add my-theme`
- Typesafe configurations, imports/modules, etc
- Work in any enviroment by default

## Contibuting to `astro-theme-provider`

### How can I contribute?

There are many ways to contribute and many of them do not involve code, giving feedback and asking questions helps a lot. We encourage contributions of any kind! Some ways you can help contribute are:

- Help improve the [documentation](https://astro-theme-provider.netlify.app/)
- Use `astro-theme-provider`, give feedback about your experience and open issues for any bugs you find
- Participate in discussions in the [Discord Channel](https://chat.astrolicious.dev), [Issues Tab](https://github.com/astrolicious/astro-theme-provider/issues), [Discussions Tab](https://github.com/astrolicious/astro-theme-provider/discussions), etc and give suggestions for improvments or enhancments
- Take ownership of an issue (typically tagged as `help wanted`), this can be anything from a simple bug fix to a large enhancement for the project
- Review PRs, it is important that code is reviewed and approved by someone that did not author the PR

### Setting up local repo

> **Note**: This repo uses ***[pNPM](https://pnpm.io/)***, you must use ***pNPM*** as your package manager

1. Clone the repo locally

```
git clone https://github.com/astrolicious/astro-theme-provider.git
```

2. Install dependencies

```
pnpm install
```

3. Install browsers for e2e testing

```
pnpm exec playwright install --with-deps
```

4. Build the package

```
pnpm package:dev
```

Now that the repo has been setup and the package has been built, you can use `pnpm test` to test your changes and use `pnpm playground:dev` to play around with your changes

### PRs

- Use the command `pnpm lint:fix` to lint your PR (last commit)
- Use the command `pnpm changeset` to add a changeset to your PR

#### Merging

- PRs must have passing checks before merging
- Always squash merge

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
