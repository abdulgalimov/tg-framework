import {
  type ActionItem,
  type AllActionsTree,
  PayloadsField,
  StorageServiceExternal,
} from "../../types";
import { ActionMeta } from "./meta";
import {
  ACTIONS_TREE_EXT,
  Inject,
  Injectable,
  STORAGE_SERVICE_EXT,
} from "../../di";

const ActionItemSystemKeys = [PayloadsField];

type IdsMap = Record<string, number>;

type ParsedData = Record<string, unknown>;

@Injectable()
export class ActionsService {
  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  @Inject(STORAGE_SERVICE_EXT)
  private readonly storage!: StorageServiceExternal;

  private readonly byId: Record<number, ActionItem> = {};

  private async getIds(actionsList: string[]): Promise<IdsMap> {
    let savedMap = await this.storage.getValue<IdsMap>("actions");
    if (savedMap === null) {
      savedMap = {};
    }

    let maxId = 0;
    Object.values(savedMap).forEach((id) => {
      maxId = Math.max(maxId, id);
    });

    actionsList.forEach((path) => {
      if (!savedMap[path]) {
        savedMap[path] = ++maxId;
      }
    });

    await this.storage.setValue("actions", savedMap);

    return savedMap;
  }

  public async parse() {
    const actionsList: ActionItem[] = [];
    const actionsPath: string[] = [];

    const parseItem = (
      data: ParsedData,
      keyPath: string[],
      parent: ActionItem | null,
    ) => {
      const actionItem = data as ActionItem;

      const meta = new ActionMeta(actionItem, keyPath, parent);
      Object.defineProperty(data, "meta", {
        value: meta,
        enumerable: false,
      });

      if (keyPath.length > 0) {
        actionsList.push(actionItem);
        actionsPath.push(meta.fullKey);
      }

      Object.entries(data)
        .filter(
          ([key, value]) =>
            typeof value === "object" && !ActionItemSystemKeys.includes(key),
        )
        .map(([key, value]) => {
          parseItem(value as ParsedData, [...keyPath, key], actionItem);

          Object.defineProperty(data, key, {
            value: value,
            enumerable: false,
          });
        });
    };

    parseItem(this.actionsTree, [], null);

    const idsMap = await this.getIds(actionsPath);

    actionsList.forEach((actionItem: ActionItem) => {
      const meta = actionItem.meta as ActionMeta;

      const id = idsMap[meta.fullKey];
      if (!id) {
        throw new Error("Not found action id");
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
