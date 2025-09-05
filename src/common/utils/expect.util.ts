export class Expect {
  private condition: boolean;
  private executed = false;

  constructor(condition: boolean) {
    this.condition = condition;
  }

  static when(condition: boolean): Expect {
    return new Expect(condition);
  }

  then<T>(callback: () => T): ExpectResult<T> {
    if (this.condition && !this.executed) {
      this.executed = true;
      return new ExpectResult(callback(), true);
    }
    return new ExpectResult(undefined, false);
  }
}

export class ExpectResult<T> {
  constructor(
    private value: T | undefined,
    private wasExecuted: boolean,
  ) {}

  otherwise<U>(callback: () => U): T | U {
    if (this.wasExecuted) {
      return this.value;
    }
    return callback();
  }

  getValue(): T | undefined {
    return this.value;
  }

  wasConditionMet(): boolean {
    return this.wasExecuted;
  }
}
