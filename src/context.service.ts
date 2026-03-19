import { InitType } from './types/init';
import { getContext, UserContextAny } from './context';

export class ContextService<T extends InitType> {
  public get<C extends UserContextAny<T['user']> = UserContextAny<T['user']>>() {
    return getContext<C>();
  }
}
