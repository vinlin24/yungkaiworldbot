# yung kai world's TempBot

Misc bot for **yung kai world**, the Discord server for the music artist [yung
kai](https://linktr.ee/yungkaiboy)!


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

* [Node.js](https://nodejs.org/) v16+
* [npm](https://www.npmjs.com/) v9+

```sj
node --version
npm --version
```

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

For Discord IDs, you should enable **Developer Mode** to be able to conveniently
copy IDs from the right-click context menus of servers, channels, roles, users,
etc. To enable it, go to **User Settings > Advanced > Developer Mode**.

For variables names, we use this suffix convention:

* `_GID`: Guild ID. Servers are referred to as "guilds" in the Discord API.
* `_CID`: Channel ID. This can be any type of channel (text, voice, etc.).
* `_RID`: Role ID. This is useful for role-based features. It is also the basis
  of this bot's [privilege system](src/middleware/privilege.middleware.ts).
* `_UID`: User ID. This is useful for user-based features (to give the bot a
  little personality, basically).

GIDs, CIDs, and RIDs can be hard-coded into [config.ts](src/config.ts). UIDs
should be environment variables.

> :warning: **NON-BOT USER IDs SHOULD BE REDACTED IN VERSION CONTROL.**
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


## Running

### package.json Scripts

| Shell Command      | Description                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `npm run dev`      | Start the bot runtime. This interprets the TypeScript source directly for fastest startup.   |
| `npm run sync`     | Deploy application commands to Discord's backend. This does not start the bot runtime.       |
| `npm run clean`    | Clear JavaScript build files.                                                                |
| `npm run build`    | Compile TypeScript source to JavaScript.                                                     |
| `npm start`        | Start the bot runtime. This invokes Node.js on the compiled JavaScript ready for production. |
| `npm run stealth`  | Same as `npm run dev` but run in "stealth mode".                                             |
| `npm run now`      | Run existing JavaScript build files right away.                                              |
| `npm test`         | Run tests.                                                                                   |
| `npm run lint`     | Run the linter to report errors/warnings.                                                    |
| `npm run lint:fix` | Run the linter and fix all fixable errors in-place.                                          |


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
    node dist/index.js --sync
    ```

* Start the bot runtime (log in to Discord and listen for commands and events):

    ```sh
    # npm start
    node dist/index.js
    ```

The [discord.js
Guide](https://discordjs.guide/creating-your-bot/command-deployment.html#command-registration)
explains well the rationale behind this kind of separation.

Your flow would look something like:

1. Define/update a command definition in source code.
2. Deploy the command with `--sync`.
3. Start the bot runtime to see it in action.
4. Changes to the code that don't modify command definitions can skip Step 2.


## Project Architecture

**This codebase uses the [discord.js](https://discord.js.org/#/) framework for
creating the Discord bot.**

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

My main goal with this is to promote code reusability and modularity, also
making it easier to test the modules through a code mocking framework (we use
[Jest](https://jestjs.io/)) instead of having to go through the real Discord API
and spamming commands/messages on the real server.


### Commands

Command modules should be created anywhere under
[controllers/](src/controllers/) and end with `.controller.ts` to be discovered
and loaded by our [dynamic command loader](src/bot/command.loader.ts) on bot
startup. The module *must* export a `CommandSpec` object, but I've defined a
`CommandBuilder` helper class to make building this object more convenient and
readable.

Refer to the [`CommandSpec`](src/types/command.types.ts) type for documentation
on the different parts of a command to expose per module. At a high-level, a
command contains zero or more **checks**, which are like middleware determining
whether the main callback should run, followed by the main `execute` controller.


#### Command Lifecycle

0. Command is deployed to Discord via REST API (using a special [command line
   switch](#packagejson-scripts)).
1. User enters a slash command on the Discord application.
2. Command is forwarded from Discord server to discord.js runtime, which
   encapsulates the context as a `ChatInputCommandInteraction` object and emits
   it with an `interactionCreate` event.
3. `interactionCreate` event is received by a [special event
   listener*](src/bot/listeners/command.listener.ts) on our `BotClient` class,
   which dispatches the correct `CommandRunner` to handle it.
4. `CommandRunner` executes the [command pipeline](#command-execution-pipeline)
   defined by the `CommandSpec` with which it was initialized.

*Note that commands are really just a special form of event,
`interactionCreate`.*


#### Command Execution Pipeline

From [command.runner.ts](src/bot/command.runner.ts):

```ts
/**
 * COMMAND EXECUTION PIPELINE
 * --------------------------
 * Checks: run predicate
 *    -> success: move onto Execute
 *    -> fail: run onFail if provided, short-circuit
 *        -> error: handleCommandError, short-circuit
 *    -> error: handleCommandError, short-circuit
 * Execute: run execute
 *    -> success: move onto Cleanup
 *    -> error: handleCommandError, return
 * Cleanup: run all afterExecute hooks of checks
 *    -> success: return
 *    -> error: handleCommandError, DON'T short-circuit
 */
```


### Event Listeners

Event listener modules should be created anywhere under
[controllers/](src/controllers/) and end with `.listener.ts` to be discovered,
loaded, and registered on our bot by our [dynamic listener
loader](src/bot/listener.loader.ts) on bot startup. The module *must* export a
`ListenerSpec` object, but I've defined a `ListenerBuilder` helper class to make
building this object more convenient and readable.

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

From [listener.runner.ts](src/bot/listener.runner.ts):

```ts
/**
 * LISTENER EXECUTION PIPELINE
 * ---------------------------
 * Filters: run predicate
 *    -> success: move onto Execute
 *    -> fail: run onFail if provided, short-circuit
 *        -> error: handleListenerError, short-circuit
 *    -> error: handleListenerError, short-circuit
 * Execute: run execute
 *    -> success: move onto Cleanup
 *    -> error: handleListenerError, return
 * Cleanup: run all afterExecute hooks of filters
 *    -> success: return
 *    -> error: handleListenerError, DON'T short-circuit
 */
```


### Database

This bot uses [MongoDB](https://www.mongodb.com/) for persistent storage. You
can use this script to connect to the MongoDB cluster:

```sh
scripts/db-connect.sh
```

This automatically loads the [.env](#environment-file) file and uses the
`DB_CONN_STRING` to connect to the cluster.
