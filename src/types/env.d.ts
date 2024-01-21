declare global {
  type EnvironmentVariables = {

    // ////////////////////// //
    //      SDLC Related      //
    // ////////////////////// //

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
    LOGGER_LEVEL?: "error" | "warning" | "info" | "debug";

    // ///////////////////// //
    //      Bot Related      //
    // ///////////////////// //

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

    // ////////////////////////// //
    //      Discord Role IDs      //
    // ////////////////////////// //

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

    // //////////////////////////// //
    //      Discord Channel IDs     //
    // //////////////////////////// //

    /**
     * ID of the text channel where bot commands are generally directed.
     */
    BOT_SPAM_CID: string;
    /**
     * ID of the text channel where new members introduce themselves.
     */
    INTRODUCTIONS_CID: string;
    /**
     * ID of the text channel for general pictures, photographs, and GIFs.
     */
    MEDIA_CID: string;
    /**
     * ID of the text channel for artwork.
     */
    ARTWORK_CID: string;
    /**
     * ID of the text channel for pet pictures.
     */
    STINKYS_FRIENDS_CID: string;
    /**
     * ID of the text channel for music discussion or song links.
     */
    MUSIC_CHAT_CID: string;
    /**
     * ID of the text channel for gaming-related discussion.
     */
    GAMING_CID: string;
    /**
     * ID of the text channel for recipes and food pictures.
     */
    COOKING_TIME_CID: string;

    // ////////////////////////// //
    //      Discord User IDs      //
    // ////////////////////////// //

    LUKE_UID: string;
    KLEE_UID: string;
    COFFEE_UID: string;
    CXTIE_UID: string;
    TACO_UID: string;
    WAV_UID: string;
    BUNNY_UID: string;
    J_UID: string;
    KAI_UID: string;
    NI_UID: string;
    S_UID: string;
    WYS_UID: string;

    // ///////////////////////// //
    //      Discord Bot IDs      //
    // ///////////////////////// //

    /**
     * The UID of our bot user.
     */
    CLIENT_UID: string;
    MUDAE_UID: string;
  };

  namespace NodeJS {
    interface ProcessEnv extends Readonly<EnvironmentVariables> { }
  }
}

export { };
