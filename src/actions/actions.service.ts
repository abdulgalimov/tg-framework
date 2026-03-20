import type { ActionsStore } from '../interfaces';
import { type ActionItem, type AllActionsTree, PayloadsField, TreeNode } from '../types';
import { ActionMeta } from './meta';
import { InitType } from '../types/init';

const ActionItemSystemKeys = [PayloadsField];

type IdsMap = Record<string, number>;

type ParsedData = Record<string, unknown>;

export type Actions<T extends InitType> = {
  readonly tree: TreeNode<T['tree']> & AllActionsTree;
  hasById(id: number): boolean;
  getById<Action = ActionItem>(id: number): Action;
};

export class ActionsService<T extends InitType> {
  private readonly byId: Record<number, ActionItem> = {};

  public readonly tree: TreeNode<T['tree']> & AllActionsTree;

  public constructor(
    tree: T['tree'],
    private readonly store: ActionsStore,
  ) {
    this.tree = tree as TreeNode<T['tree']> & AllActionsTree;
  }

  private async getIds(actionsList: string[]): Promise<IdsMap> {
    const actions = await this.store.createAll(actionsList);

    return actions.reduce((acc, action) => {
      acc[action.path] = action.id;
      return acc;
    }, {} as IdsMap);
  }

  public async parse() {
    const actionsList: ActionItem[] = [];
    const actionsPath: string[] = [];

    const parseItem = (data: ParsedData, keyPath: string[], parent: ActionItem | null) => {
      const actionItem = data as ActionItem;

      const meta = new ActionMeta(actionItem, keyPath, parent);
      Object.defineProperty(data, 'meta', {
        value: meta,
        enumerable: false,
      });

      actionsList.push(actionItem);
      actionsPath.push(meta.fullKey);

      Object.entries(data)
        .filter(([key, value]) => typeof value === 'object' && !ActionItemSystemKeys.includes(key))
        .forEach(([key, value]) => {
          parseItem(value as ParsedData, [...keyPath, key], actionItem);

          Object.defineProperty(data, key, {
            value: value,
            enumerable: false,
          });
        });
    };

    parseItem(this.tree, [], null);

    const idsMap = await this.getIds(actionsPath);

    actionsList.forEach((actionItem: ActionItem) => {
      const meta = actionItem.meta as ActionMeta;

      const id = idsMap[meta.fullKey];
      if (!id) {
        throw new Error('Not found action id');
      }
      meta.setId(id);

      this.byId[actionItem.meta.id] = actionItem;
    });

    actionsList.forEach((actionItem: ActionItem) => {
      const meta = actionItem.meta as ActionMeta;

      meta.initParents();
    });
  }

  public hasById(id: number): boolean {
    return !!this.byId[id];
  }

  public getById<Action = ActionItem>(id: number): Action {
    const actionItem = this.byId[id];

    if (!actionItem) {
      throw new Error(`Invalid action id: ${id}`);
    }

    return actionItem as Action;
  }
}
