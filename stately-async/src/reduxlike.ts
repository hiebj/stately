import { Omit } from "./subtraction";

export interface Action<T = any> {
  type: T;
}

export type Reducer<S = any, A extends Action = Action> = (state: S | undefined, action: A) => S;

export type Dispatch<A extends Action = Action> = <T extends A>(action: T) => T

export type Unsubscribe = () => void

export interface Store<S> {
  dispatch: Dispatch;
  getState(): S;
  subscribe(listener: () => void): Unsubscribe;
}

export type Middleware<S = any> = (store: Omit<Store<S>, 'subscribe'>) => (next: Dispatch<Action>) => (action: any) => any

export type ActionCreator<A> = (...args: any[]) => A
