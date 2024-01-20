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

    // //////////////////////////// //
    //      3rd Party Services      //
    // //////////////////////////// //

    /**
     * Connection string for MongoDB service.
     */
    DB_CONN_STRING: string;
    /**
     * Name of MongoDB database to use.
     */
    DB_NAME: string;
  };

  namespace NodeJS {
    interface ProcessEnv extends Readonly<EnvironmentVariables> { }
  }

  /**
   * Utility type for filtering environment variable key names based on the
   * template literal type parameter.
   */
  type KeyWithFormat<Template extends string> = Exclude<{
    [K in keyof EnvironmentVariables]: K extends Template ? K : never;
  }[keyof EnvironmentVariables], undefined>;

  /**
   * Utility type for narrowing a string to the available UID environment
   * variable keys.
   */
  type UIDKey = KeyWithFormat<`${string}_UID`>;
}

export { };
