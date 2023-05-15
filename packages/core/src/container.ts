import { Constructor } from './types';

export type ContainerType = {
    resolve<T>(token: Constructor<T> | string | symbol): T;
};

export class Container {
    public resolve;

    public constructor(container: ContainerType) {
        this.resolve = container.resolve.bind(container);
    }
}
