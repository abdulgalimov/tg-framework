import { type PayloadSchemaAny } from '../payload';
import { type ActionItem, type Meta, PayloadsField } from '../types';

export class ActionMeta implements Meta {
  private readonly data: Record<string, unknown>;

  private readonly isRoot: boolean;

  // all parent action ids
  private readonly parentIds: Record<number, boolean> = {};

  // parent action
  public readonly parent: ActionItem | null;

  // full key path to action
  public readonly fullKey: string;

  // all schemas with parents
  public readonly schemas: PayloadSchemaAny[] = [];

  private _id: number | null = null;

  public constructor(
    data: Record<string, unknown>,
    keyPath: string[],
    parentAction: ActionItem | null,
  ) {
    this.data = data;

    this.fullKey = keyPath.join('.');
    this.isRoot = keyPath.length === 0;

    this.parent = parentAction;
  }

  public get id(): number {
    if (this._id === null) {
      throw new Error('id must be defined');
    }

    return this._id;
  }

  public setId(id: number) {
    this._id = id;
  }

  public initParents() {
    let meta: ActionMeta | undefined = this as ActionMeta;

    while (meta && !meta.isRoot) {
      this.parentIds[meta.id] = true;

      const schema = meta.data[PayloadsField];
      if (schema) {
        this.schemas.push(schema as PayloadSchemaAny);
      }

      meta = meta.parent?.meta as ActionMeta;
    }
  }

  /**
   * Check that the current action is a child of the param parentAction.
   */
  public childOf(parentAction: ActionItem): boolean {
    return this.parentIds[parentAction.meta.id] || false;
  }
}
