export interface User {
    name: string,
    email: string,
    profile?: string,
}

export interface Account {
    balance: number,
    holdings: Holding[],
}

export interface Holding {
    symbol: string,
    quantity: number,
    price: number,
    total: number,
    timestamp: Date,
}

export enum ReduxSlices {
    Auth = 'auth-slice'
}

export enum WebSocketURL {
    ChartFeed = 'ws://localhost:8001/ws/fake/',
    OrderFeed = 'ws://localhost:8001/ws/trading/',
}