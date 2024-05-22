export class DevControlService {
  /** Whether the bot should perform concerted reactions with DEV reactions. */
  public reactWithDev: boolean = false;
  public sendWithDev: boolean = false;
}

export default new DevControlService();
