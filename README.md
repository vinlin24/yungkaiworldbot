# yung kai world's TempBot

Misc bot for **yung kai world**, the Discord server for the music artist [yung
kai](https://linktr.ee/yungkaiboy)!

This started as a throwaway for-fun project, hence the name "TempBot", but the
name stuck. This codebase has some simple features up and running but is an
ongoing project welcome to requests and suggestions. Server members are welcome
to contribute by requesting features, reporting bugs, or opening pull
request/issues!


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
mkdir yungkaiworldbot
cd yungkaiworldbot
git clone https://github.com/vinlin24/yungkaiworldbot .
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
etc. To enable it, go to **User Settings > Advanced > Developer Mode**. For
environment variable names, we use this suffix convention:

* `_GID`: Guild ID. Servers are referred to as "guilds" in the Discord API.
* `_CID`: Channel ID. This can be any type of channel (text, voice, etc.).
* `_RID`: Role ID. This is useful for role-based features. It is also the basis
  of this bot's [privilege
  system](https://en.wikipedia.org/wiki/Privilege_(computing)).
* `_UID`: User ID. This is useful for user-based features (to give the bot a
  little personality, basically).

> :warning: **NON-BOT USER IDs SHOULD BE REDACTED IN VERSION CONTROL.**
>
> Guild, channel, and role IDs are likely benign. While Discord IDs in general
> are only used internally by Discord's API, [Discord
> themselves](https://discord.com/safety/confidentiality-in-moderation) stated
> that **user IDs** should be considered personally identifiable information
> (PII). Because this bot is open-source, we want to prevent any chance of PII
> leak or doxing.
>
> On a related note, use your common sense when naming user ID keys. Use
> nicknames or "gamer aliases" where possible. Do not use full or legal names
> under any circumstances. See [uids.utils.ts](src/utils/uids.utils.ts).


## Running

### package.json Scripts

| Shell Command   | Description                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`   | Start the bot runtime. This interprets the TypeScript source directly for fastest startup.   |
| `npm run sync`  | Deploy application commands to Discord's backend. This does not start the bot runtime.       |
| `npm run clean` | Clear JavaScript build files.                                                                |
| `npm run build` | Compile TypeScript source to JavaScript.                                                     |
| `npm start`     | Start the bot runtime. This invokes Node.js on the compiled JavaScript ready for production. |


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

**TODO.**
