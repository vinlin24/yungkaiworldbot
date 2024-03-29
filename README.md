# yung kai world's TempBot

Misc bot for **yung kai world**, the Discord server for the music artist [yung
kai](https://linktr.ee/yungkaiboy)! Created with
[discord.js](https://discord.js.org/#/).


## Overview

The iconic **@TempBot** lurks in the channels, always ready to ~~annoy~~ bring
some humor or personality to the server with stupid Dad jokes, entertaining your
different catchphrases, and more! Now complete with timeout permissions.
**:nekocatshrug:**

This started as a throwaway for-fun project, hence the name "TempBot", but the
name stuck. This codebase is an ongoing project welcome to requests and
suggestions. Server members are welcome to contribute by requesting features,
reporting bugs, or opening pull request/issues! You can also communicate your
requests or receive periodic notifications about new features in the [TempBot
feature requests
thread](https://discord.com/channels/1101561213663580190/1181497697560186961).


## Setup

### Local Setup

Prerequisites:

* [Node.js](https://nodejs.org/) v20+
* [npm](https://www.npmjs.com/) v9+

> [!NOTE]
>
> Older versions may or may not work. These are just what I have been developing
> on and thus what I know to be stable.

Clone the repository if you haven't:

```sh
git clone https://github.com/vinlin24/yungkaiworldbot
cd yungkaiworldbot
```

Install dependencies:

```sh
npm install
```


### Environment File

For the bot to function properly, you need to create and populate the
environment file. Some environment variables are highly sensitive (such as the
bot token), so this file is deliberately [.gitignore](.gitignore)d and must be
manually regenerated.

An [.env.example](.env.example) is provided as a skeleton for the required
**.env** file:

```sh
cp .env.example .env
```

Consult the documentation at [env.d.ts](src/types/env.d.ts) for a description of
each key and possibly where to find them to fill out the redacted values.
Contact any of the bot developers for any values you need help with or the
values for the production version of the bot.

> [!TIP]
>
> For Discord IDs (also referred to as [snowflakes](https://en.wikipedia.org/wiki/Snowflake_ID)), you should enable **Developer Mode** to be able to
> conveniently copy IDs from the right-click context menus of servers, channels,
> roles, users, etc. To enable it, go to **User Settings > Advanced > Developer
> Mode**.

> [!CAUTION]
> **UIDs should be environment variables. Furthermore, non-bot UIDs should
> ALWAYS be redacted in version control.**
>
> <details>
> <summary>Explanation</summary>
>
> While Discord IDs in general are only used internally by Discord's API,
> [Discord themselves](https://discord.com/safety/confidentiality-in-moderation)
> stated that **user IDs** should be considered personally identifiable
> information (PII). Because this bot is open-source, we want to prevent any
> chance of PII leak or doxing.
>
> On a related note, use your common sense when naming user ID keys. Use
> nicknames or "gamer aliases" where possible. Do not use full or legal names
> under any circumstances.
>
> </details>

Also see [our naming conventions for snowflake-related
variables](#discord-snowflakes).


## Running


### Program Entry Points

| Shell Command     | Description                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`     | Start the bot runtime. This interprets the TypeScript source directly for fastest startup. |
| `npm run sync`    | Deploy application commands to Discord's backend. This does not start the bot runtime.     |
| `npm run stealth` | Same as `npm run dev` but run in "stealth mode".                                           |
| `npm start`       | Start the bot runtime. This invokes Node.js on compiled JavaScript, ready for production.  |

### Housekeeping Commands

| Shell Command      | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run build`    | Compile TypeScript source to JavaScript.                   |
| `npm run clean`    | Clear JavaScript build files.                              |
| `npm test`         | Run tests. Include a regex after it to filter test suites. |
| `npm run lint`     | Run the linter to report errors/warnings.                  |
| `npm run lint:fix` | Run the linter and fix all fixable errors in-place.        |


### Command Registration vs. Bot Runtime

Application (slash) commands have to be explicitly registered with Discord for
them to show up in the commands pop-up on the Discord application (and thus be
able to be used). They should also be redeployed every time the *definition* of
the command changes (description, options, etc.).

There is a daily limit on application command creation, so it doesn't make sense
to automate this into the main bot runtime (such as on the "ready" event). The
program thus separates the two modes through command line flags:

* Synchronize slash command definitions with Discord's backend (bot itself
  doesn't come online):

    ```sh
    # npm run sync
    node . --sync
    ```

* Start the bot runtime (log in to Discord and listen for commands and events):

    ```sh
    # npm start
    node .
    ```

The [discord.js
Guide](https://discordjs.guide/creating-your-bot/command-deployment.html#command-registration)
explains well the rationale behind this kind of separation.


### Development Flow

Thus, your flow would look something like:

1. Define/update a command definition in source code.
2. Deploy the command with `--sync`.
3. Start the bot runtime to see it in action.
4. Changes to the code that don't modify command definitions can skip Step 2.


## Project Architecture


### Directory Structure

The directory structure loosely resembles the pattern recommended in the
[discord.js Guide](https://discordjs.guide/) in that commands and events are
defined one-per-file and then dynamically discovered and loaded at runtime.
However, I also got a bit carried away defining a sort of
framework-within-a-framework on top of discord.js to further streamline adding
new commands and event listeners. This behind-the-scenes work is under
[bot/](src/bot/) and shouldn't need to be touched outside of project-wide
refactoring.

Notably, I initially took inspiration from how
[Express.js](https://expressjs.com/) uses a builder-like pattern to register
callbacks on some handler class, as well as the support for reusable middleware
that offloads the burden of data validation from the main command/event listener
callback.

I chose to liken the project structure to the typical
middleware-controller-service layer design from backend REST API architecture:

* Modules implementing the main logic for handling commands and event listeners
  are collectively referred to as "[controllers](src/controllers/)". Start here
  if you want to get up and running with adding a new command/event listener,
  and reference any of the existing modules as examples of the required file
  anatomy.
* Checks and filters for the commands and event listeners respectively are
  analogous to "[middleware](src/middleware/)".
* Complex state management can be encapsulated within
  "[services](src/services/)", serving as the single source of truth for
  stateful data or as clients for 3rd party APIs.
* TypeScript-related utilities or helper classes/abstract classes/interfaces are
  under [types/](src/types/).
* Project-wide utility functions are under [utils/](src/utils/).
* Now that we have a database set up, there's a place for the
  [models/](src/models/) layer too.

My main goal with this is to promote code reusability and modularity, also
making it easier to test the modules through a code mocking framework (we use
[Jest](https://jestjs.io/)) instead of having to go through the real Discord API
and spamming commands/messages on the real server.


### Commands

> [!IMPORTANT]
>
> Command modules should be created anywhere under
> [controllers/](src/controllers/) and end with `.command.ts` to be discovered
> and loaded by our [dynamic command loader](src/bot/command.loader.ts) on bot
> startup. The module *must* export a `CommandSpec` object, but I've defined a
> `CommandBuilder` helper class to make building this object more convenient and
> readable.

Refer to the [`CommandSpec`](src/types/command.types.ts) type for documentation
on the different parts of a command to expose per module. At a high-level, a
command contains zero or more **checks**, which are like middleware determining
whether the main callback should run, followed by the main `execute` controller.


#### Command Lifecycle

0. Command is deployed to Discord via REST API (using a special [command line
   flag](#program-entry-points)).
1. User enters a slash command on the Discord application.
2. Command is forwarded from Discord server to discord.js runtime, which
   encapsulates the context as a `ChatInputCommandInteraction` object and emits
   it with an `interactionCreate` event.
3. `interactionCreate` event is received by a [special event
   listener*](src/bot/listeners/command.listener.ts) on our `BotClient` class,
   which dispatches the correct `CommandRunner` to handle it.
4. `CommandRunner` executes the [command pipeline](#command-execution-pipeline)
   defined by the `CommandSpec` with which it was initialized.

> [!TIP]
>
> \*Note that commands are really just a special form of event,
> `interactionCreate`.


#### Command Execution Pipeline

```mermaid
graph LR;
  Checks-->Execute-->Cleanup
```

1. **Checks**: run `predicate` of each check, in the order they were provided in
   the command spec.
   1. On (all) success: move onto **Execute**.
   2. On failure: run `onFail` of the check if provided and short-circuit.
   3. On error: run the global `handleCommandError` and short-circuit.
2. **Execute**: run `execute`.
   1. On success: move onto **Cleanup**.
   2. On failure: simply short-circuit.
   3. On error: run the global `handleCommandError` and short-circuit.
3. **Cleanup**: run the `afterExecute` hook of ALL checks.
   1. On success: continue.
   2. On error: run the global `handleCommandError`, but DON'T short-circuit;
      give every hook a chance to execute.


### Event Listeners

> [!IMPORTANT]
>
> Event listener modules should be created anywhere under
> [controllers/](src/controllers/) and end with `.listener.ts` to be discovered,
> loaded, and registered on our bot by our [dynamic listener
> loader](src/bot/listener.loader.ts) on bot startup. The module *must* export a
> `ListenerSpec` object, but I've defined a `ListenerBuilder` helper class to
> make building this object more convenient and readable.

Refer to the [`ListenerSpec`](src/types/listener.types.ts) type for
documentation on the different parts of a listener to expose per module. At a
high-level, a listener contains zero or more **filters**, which are like
middleware determining whether the main callback should run, followed by the
main `execute` controller.

Note that because of the immense popularity of the
`ListenerSpec<Events.MessageCreate>` specialization, there also exists a
`MessageListenerBuilder` helper. Notably, this adds support for a **cooldown**
mechanism, which has become very popular with requests.


#### Event Lifecycle

1. An event occurs on the Discord server.
2. Event is sent to our `BotClient` running under the discord.js runtime, which
   makes the bot emit the event.
3. The emitted event is received by all callbacks registered to receive it.
   These callbacks are the entry point into the `ListenerRunner`.
4. `ListenerRunner` executes the [listener
   pipeline](#listener-execution-pipeline) defined by the `ListenerSpec` with
   which it was initialized.


#### Listener Execution Pipeline

```mermaid
graph LR;
  Filters-->Execute-->Cleanup;
```

1. **Checks**: run `predicate` of each filter, in the order they were provided in
   the listener spec.
   1. On (all) success: move onto **Execute**.
   2. On failure: run `onFail` of the filter if provided and short-circuit.
   3. On error: run the global `handleListenerError` and short-circuit.
2. **Execute**: run `execute`.
   1. On success: move onto **Cleanup**.
   2. On failure: simply short-circuit.
   3. On error: run the global `handleListenerError` and short-circuit.
3. **Cleanup**: run the `afterExecute` hook of ALL filters.
   1. On success: continue.
   2. On error: run the global `handleListenerError`, but DON'T short-circuit;
      give every hook a chance to execute.


### Database

This bot uses [MongoDB](https://www.mongodb.com/) for persistent storage. You
can use this script to connect to the MongoDB cluster:

```sh
scripts/db-connect.sh
```

This automatically loads the [.env](#environment-file) file and uses the
`DB_CONN_STRING` to connect to the cluster.


## Repository Conventions


### Discord Snowflakes

We use this suffix convention:

* `_GID`: Guild ID. Servers are referred to as "guilds" in the Discord API.
* `_CID`: Channel ID. This can be any type of channel (text, voice, etc.).
* `_RID`: Role ID. This is useful for role-based features. It is also the basis
  of this bot's [privilege system](src/middleware/privilege.middleware.ts).
* `_UID`: User ID. This is useful for user-based features (to give the bot a
  little personality, basically). I learned later that "UID" is more commonly
  accepted as the general term ["unique
  identifier"](https://en.wikipedia.org/wiki/Unique_identifier), NOT "user ID",
  but hopefully this ambiguity isn't a problem in the contexts they're used.

GIDs, CIDs, and RIDs can be hard-coded into [config.ts](src/config.ts). **UIDs
should be [environment variables](#environment-file).**


### Git/GitHub

> [!NOTE]
>
> Some of these are opinionated, so it does not matter that much, but I
> think that staying *consistent* with the practices I've set will help reduce
> friction in collaborative development, if/when it happens. I'm also a
> fledgling myself, so if a senior happens to stumble across this codebase, I
> would be happy to learn more about version control best practices.

I tend to use these prefixes for branch names (for readability as well as ease
of filtering/categorization):

| Prefix      | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `main`      | This is not a prefix. `main` is the stable branch. It's also protected.                    |
| `feat/`     | A new feature for the bot.                                                                 |
| `setup/`    | Set up something new related to project itself (e.g. introducing a new 3rd party service). |
| `refactor/` | Refactoring related to project itself. Preferably no changes in features themselves.       |
| `test/`     | Adding or improving tests.                                                                 |
| `tweak/`    | A minor change to existing features (e.g. changing the values of constants).               |

Capitalize the first letter and use present, imperative tense for commit
messages, [the way Git itself does
it](https://stackoverflow.com/a/3580764/14226122). Think of your message as the
blank in "This commit will _____".

Also, try to make use of labels on
[**GitHub issues**](https://github.com/vinlin24/yungkaiworldbot/issues) to
~~make them look better~~ better organize them based on category/urgency.


### Style


#### Code Style

We use [ESLint](https://eslint.org/) for code linting. The
[CI](.github/workflows/) is set up to run the linter before allowing PRs to
pass, so please respect it. Try to configure your editor of choice to
automatically detect and/or fix linter errors based on our [.eslintrc.json
configuration](.eslintrc.json). Feel free to suggest (justified) changes to the
linting setup too.

> [!TIP]
>
> For VS Code users (like me!), [this ESLint
> extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
> should be all you need to get started.


#### Encodings

Keep all whitespace to LF (Unix-style) EOL and use UTF-8
character encoding. These settings are also written in the repository
[.gitattributes](.gitattributes).


#### File Naming

Prepend the architecture layer to the file extension e.g.
`.command.ts`, `.service.ts`, `.utils.ts`, etc. *(Plural or singular? Uhhh...
just be consistent with what I have LOL)* For unit test files, make sure to add
a `test` to it e.g. `feature.command.test.ts`, as that is the suffix [Jest is
configured](jest.config.ts) to match when finding test suites.

This makes each
file name feel more self-contained, and it also makes searching for files by
name within an editor much easier.
