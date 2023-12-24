declare global {
  type EnvironmentVariables = {

    //////////////////////////
    //     SDLC Related     //
    //////////////////////////

    /**
     * Environment corresponding to the current software development lifecycle
     * (SDLC) stage.
     */
    NODE_ENV: "development" | "production";
    /**
     * The minimum severity level of messages to log. To be passed to Winston
     * initialization.
     *
     * Also see:
     * https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
     * */
    LOGGER_LEVEL?: "error" | "warn" | "info" | "debug";

    /////////////////////////
    //     Bot Related     //
    /////////////////////////

    /**
     * Discord bot token generated on the Discord Developer Dashboard.
     */
    BOT_TOKEN: string;
    /**
     * Client application ID generated on the Discord Developer Dashboard.
     */
    APPLICATION_ID: string;
    /**
     * Guild ID of yung kai world, the sole server for which this bot is
     * specialized.
     */
    YUNG_KAI_WORLD_GID: string;

    //////////////////////////////
    //     Discord Role IDs     //
    //////////////////////////////

    /**
     * Role ID for bot developers.
     */
    BOT_DEV_RID: string;
    /**
     * Role ID for Kai, the server owner.
     */
    KAI_RID: string;
    /**
     * Role ID for "alpha mods", the greater moderator role of the server.
     */
    ALPHA_MOD_RID: string;
    /**
     * Role ID for "baby mods", the lesser moderator role of the server.
     */
    BABY_MOD_RID: string;

    //////////////////////////////
    //     Discord User IDs     //
    //////////////////////////////

    LUKE_UID?: string;
    KLEE_UID?: string;
    COFFEE_UID?: string;
    CXTIE_UID?: string;
    TACO_UID?: string;
  };

  namespace NodeJS {
    interface ProcessEnv extends Readonly<EnvironmentVariables> { }
  }
}

export { };
