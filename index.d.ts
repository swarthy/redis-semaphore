// Type definitions for redis-semaphore 0.2
// Project: https://github.com/swarthy/redis-semaphore#readme
// Definitions by: My Self <https://github.com/me>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import {RedisClient} from "redis";

export interface TimeoutOptions {
    lockTimeout: number,
    acquireTimeout: number,
    retryInterval: number,
    refreshInterval?: number
}

export class Mutex {
    protected _identifier: string;
    protected _client: RedisClient;
    protected _key: string;
    protected _lockTimeout: number;
    protected _acquireTimeout: number;
    protected _retryInterval: number;

    constructor(client: RedisClient, key: string, timeoutOptions: TimeoutOptions);

    public acquire(): Promise<string>;
    public release(): Promise<boolean>;
    
    protected _refresh(): void;
    protected _startRefresh(): void;
    protected _stopRefresh(): void;
}

export class Semaphore {
    protected _identifier: string;
    protected _client: RedisClient;
    protected _key: string;
    protected _limit: number;
    protected _lockTimeout: number;
    protected _acquireTimeout: number;
    protected _retryInterval: number;

    constructor(client: RedisClient, key: string, limit: number, timeoutOptions: TimeoutOptions);

    public async acquire(): Promise<string>;
    public async release(): Promise<boolean>;

    protected _refresh(): void;
    protected _startRefresh(): void;
    protected _stopRefresh(): void;

}