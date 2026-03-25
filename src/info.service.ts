export class InfoService {
  private _username: string | undefined;

  public init(username: string) {
    this._username = username;
  }

  public get username(): string {
    if (!this._username) {
      throw new Error('Telegram is not inited');
    }
    return this._username;
  }

  public get url(): string {
    return `t.me/${this.username}`;
  }
}
