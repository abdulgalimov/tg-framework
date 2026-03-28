import { ActionItem, InitType } from './types';
import { ActionResult, MiddlewareResult } from './actions';
import { Context, ContextAny, ContextOptions } from './context';

type ActionsCallback = (ctx: ContextAny) => Promise<ActionResult>;

type MiddlewareCallback = (ctx: ContextAny) => Promise<MiddlewareResult>;

type HandlerMethod<T extends InitType, IsMiddleware extends boolean> = <
  O extends ContextOptions,
  Action extends ActionItem = O extends { action: Required<infer AA> } ? AA : ActionItem,
  Result = IsMiddleware extends true ? MiddlewareResult : ActionResult,
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
  ) => Promise<Result>,
) => void;

type GetActionHandler = {
  action: () => ActionItem;
  handler: ActionsCallback | MiddlewareCallback;
  isMiddleware?: boolean;
};

type ActionHandler = {
  handler: ActionsCallback | MiddlewareCallback;
  isMiddleware?: boolean;
};

export type Handlers<T extends InitType> = {
  middleware: HandlerMethod<T, true>;
  action: HandlerMethod<T, false>;
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

  public readonly middleware: HandlerMethod<T, true> = (actionItem, callback) => {
    this.actionHandlersList.push({
      action: () => actionItem as ActionItem,
      handler: callback as unknown as MiddlewareCallback,
      isMiddleware: true,
    });
  };
  public readonly action: HandlerMethod<T, false> = (actionItem, callback) => {
    this.actionHandlersList.push({
      action: () => actionItem as ActionItem,
      handler: callback as unknown as ActionsCallback,
    });
  };

  public getHandlers(action: ActionItem): (ActionsCallback | MiddlewareCallback)[] {
    let actionHandler = this.updateHandlersMap.get(action.meta.fullKey);
    if (!actionHandler) {
      return [];
    }

    const callbacks = [actionHandler.handler];
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
