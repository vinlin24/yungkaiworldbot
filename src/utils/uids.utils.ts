import config from "../config";

// TODO: Maybe we should move all instances of log.warning("<name> UID not
// found") to this module.

// TODO: Also, we should really deprecate this approach as it's yet another
// place to keep track of UIDs, and a redundant one too! Just stick with UID
// string constants (they already have readable names as environment
// variables!).

/**
 * Mapping of "name" to Discord user ID, useful for user-specific features and
 * functionality. While the values for the UIDs are provided in the environment
 * file, this mapping provides a way to use names as a key type.
 *
 * WARNING: Use a nickname or other alias where possible to avoid possible leaks
 * of PII. First names, especially common ones, are probably okay. Do not under
 * any circumstances use legal or full names as the keys!! This applies to
 * naming the corresponding environment variables too.
 */
const NAME_TO_UID = {
  "LUKE": config.LUKE_UID,
  "KLEE": config.KLEE_UID,
  "COFFEE": config.COFFEE_UID,
  "CXTIE": config.CXTIE_UID,
  "TACO": config.TACO_UID,
  "WAV": config.WAV_UID,
  "MUDAE": config.MUDAE_UID,
  "BUNNY": config.BUNNY_UID,
  "J": config.J_UID,
  "KAI": config.KAI_UID,
  "NI": config.NI_UID,
};

export default NAME_TO_UID;
