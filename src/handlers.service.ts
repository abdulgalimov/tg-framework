import { ActionItem, InitType } from './types';
import { UpdateResult } from './actions';
import { Context, ContextAny, ContextOptions } from './context';

type ActionsCallback = (ctx: ContextAny) => Promise<UpdateResult>;

type HandlerMethod<T extends InitType> = <
  O extends ContextOptions,
  InferAction = O extends { action: infer AA } ? AA : ActionItem,
  Action extends ActionItem = InferAction extends ActionItem ? InferAction : ActionItem,
>(
  actionItem: Action,
  callback: (
    ctx: Context<
      {
        action: Action;
        extra: O['extra'];
        form: O['form'];
      },
      T['user']
    >,
  ) => Promise<UpdateResult>,
) => void;

type GetActionHandler = {
  action: () => ActionItem;
  handler: ActionsCallback;
  isMiddleware?: boolean;
};

type ActionHandler = {
  handler: ActionsCallback;
  isMiddleware?: boolean;
};

export type Handlers<T extends InitType> = {
  middleware: HandlerMethod<T>;
  action: HandlerMethod<T>;
};

export class HandlersService<T extends InitType> implements Handlers<T> {
  private readonly actionHandlersList: GetActionHandler[];

  private readonly updateHandlersMap = new Map<string, ActionHandler>();

  public constructor() {
    this.actionHandlersList = [];
  }

  public init() {
    this.actionHandlersList.forEach((data) => {
      const action = data.action();
      this.updateHandlersMap.set(action.meta.fullKey, {
        handler: data.handler,
        isMiddleware: data.isMiddleware,
      });
    });
  }

  public readonly middleware: HandlerMethod<T> = (actionItem, callback) => {
    this.actionHandlersList.push({
      action: () => actionItem as ActionItem,
      handler: callback as ActionsCallback,
      isMiddleware: true,
    });
  };
  public readonly action: HandlerMethod<T> = (actionItem, callback) => {
    this.actionHandlersList.push({
      action: () => actionItem as ActionItem,
      handler: callback as ActionsCallback,
    });
  };

  public getHandlers(action: ActionItem): ActionsCallback[] {
    let actionHandler = this.updateHandlersMap.get(action.meta.fullKey);
    if (!actionHandler) {
      return [];
    }

    const callbacks: ActionsCallback[] = [actionHandler.handler];
    let traversalAction = action;
    while (traversalAction.meta.parent) {
      traversalAction = traversalAction.meta.parent;
      actionHandler = this.updateHandlersMap.get(traversalAction.meta.fullKey);
      if (actionHandler && actionHandler.isMiddleware) {
        callbacks.unshift(actionHandler.handler);
      }
    }

    return callbacks;
  }
}
