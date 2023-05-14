import { Constructor } from './types';

export type InjectionToken<T = any> = Constructor<T> | string | symbol;
export type ContainerType = {
    resolve<T>(token: InjectionToken<T>): T;
};

export class Container {
    public resolve;

    public constructor(container: ContainerType) {
        this.resolve = container.resolve.bind(container);
    }
}
