export class CxtieService {
  public static INIT_TIMER_REACT_CHANCE = 0.05;
  private currentReactChance = CxtieService.INIT_TIMER_REACT_CHANCE;

  public get reactChance(): number { return this.currentReactChance; }
  public set reactChance(chance: number) { this.currentReactChance = chance; }
}

export default new CxtieService();
