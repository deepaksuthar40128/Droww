import React, { useEffect, useState } from 'react';
import { useGetAccountDetailsQuery } from "@/redux/slices/api.slice.ts";
import { useWebSocket } from "@/hooks/useWebSocket.ts";
import { Holding, WebSocketURL } from "@/lib/types.ts";
import { ChartDataFeedType, ChartOrderBookDataType } from "@/pages/home/home.tsx";
import { toast } from "sonner";

export type OrderType = 'buy' | 'sell';

export interface OrderFormData {
    type: OrderType;
    price: number | '';
    quantity: number | '';
    symbol: string;
}

export interface PlaceOrderMessage {
    type: 'place_order';
    data: {
        order_type: OrderType;
        price: number;
        quantity: number;
        symbol: string;
    };
}

enum IncomingMessageType {
    Connection = 'connection_ack',
    OrderAck = 'order_placed_ack',
    UserUpdate = 'user_update',
    PlaceOrderError = 'place_order_error',
    Error = 'error',
    OrderExecuted = 'trade_executed',
}

export interface ErrorMessage {
    type: IncomingMessageType.Error | IncomingMessageType.PlaceOrderError,
    data: {
        message: string;
    };
}

export interface OrderPlacedAckMessage {
    type: IncomingMessageType.OrderAck,
    data: {
        order_id: string;
        message: string;
    };
}

export interface UserUpdateMessage {
    type: IncomingMessageType.UserUpdate,
    data: {
        balance: number;
        holdings: Holding[];
        trade: {
            trade_id: string;
            side: 'BUY' | 'SELL';
            symbol: string;
            price: number;
            quantity: number;
            total_amount: number;
        };
        timestamp: string;
    };
}

type OrderBookType = ChartOrderBookDataType;

export interface OrderFormProps {
    symbol?: string;
    setOrderBookDatum?: React.Dispatch<React.SetStateAction<OrderBookType | null>>;
}

type IncomingData = OrderPlacedAckMessage | UserUpdateMessage | OrderBookType | ErrorMessage | {
    type: IncomingMessageType.OrderExecuted
};

const OrderForm: React.FC<OrderFormProps> = ({
    symbol = 'STOCK',
    setOrderBookDatum,
}) => {
    const [orderData, setOrderData] = useState<OrderFormData>({
        type: 'buy',
        price: '',
        quantity: '',
        symbol
    });
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [availableQuantity, setAvailableQuantity] = useState<number>(0);

    const {
        data: accountDetails,
        isLoading: isAccountLoading,
        refetch: refetchAccountDetails
    } = useGetAccountDetailsQuery();

    useEffect(() => {
        if (!isAccountLoading) {
            setAvailableQuantity(accountDetails?.holdings.filter(holding => holding.symbol === symbol)?.reduce((sum, holding) => sum + holding.quantity, 0) ?? 0);
        }
    }, [isAccountLoading, accountDetails, symbol]);

    const handleInputChange = (field: keyof OrderFormData, value: number) => {
        setOrderData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOrderTypeChange = (type: OrderType) => {
        setOrderData(prev => ({
            ...prev,
            type
        }));
    };

    const calculateTotal = () => {
        const price = typeof orderData.price === 'number' ? orderData.price : 0;
        const quantity = typeof orderData.quantity === 'number' ? orderData.quantity : 0;
        return price * quantity;
    };

    const isValidOrder = () => {
        const price = typeof orderData.price === 'number' ? orderData.price : 0;
        const quantity = typeof orderData.quantity === 'number' ? orderData.quantity : 0;

        if (price <= 0 || quantity <= 0) return false;

        if (orderData.type === 'buy') {
            return calculateTotal() <= (accountDetails?.balance ?? 0);
        } else {
            return quantity <= availableQuantity;
        }
    };

    const resetForm = () => {
        setOrderData(prev => ({
            ...prev,
            price: '',
            quantity: ''
        }));
    };

    const handlePlaceOrder = async () => {
        if (!isValidOrder() || !connected) return;

        setIsPlacingOrder(true);

        try {
            const orderMessage: PlaceOrderMessage = {
                type: 'place_order',
                data: {
                    order_type: orderData.type,
                    price: typeof orderData.price === 'number' ? orderData.price : 0,
                    quantity: typeof orderData.quantity === 'number' ? orderData.quantity : 0,
                    symbol: orderData.symbol
                }
            };

            placeOrder(orderMessage);
        } catch (error) {
            console.error('Order placement failed:', error);
            toast.error('Failed to place order. Please try again.');
            setIsPlacingOrder(false);
        }
    };

    const total = calculateTotal();

    const {
        connected,
        sendMessage: placeOrder,
    } = useWebSocket<PlaceOrderMessage, IncomingData>(WebSocketURL.OrderFeed, {
        onMessage: (data) => {
            switch (data.type) {
                case ChartDataFeedType.OrderBook:
                    setOrderBookDatum?.(data);
                    break;

                case IncomingMessageType.OrderAck:
                    setIsPlacingOrder(false);
                    resetForm();
                    toast.success(data.data.message || 'Order placed successfully!');
                    refetchAccountDetails();
                    break;

                case IncomingMessageType.Error:
                case IncomingMessageType.PlaceOrderError:
                    setIsPlacingOrder(false);
                    toast.error(data.data.message || 'An error occurred while placing the order.');
                    break;

                case IncomingMessageType.UserUpdate:
                    refetchAccountDetails();
                    break;
                case IncomingMessageType.OrderExecuted:
                    toast.success('Order executed successfully!');
            }
        },
        shouldReconnect: false
    });

    return (
        <div
            className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Trade {symbol}
                            </h3>
                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {connected ? 'Connected' : 'Disconnected'}
                            </div>
                        </div>
                        <div className="text-sm">
                            {isAccountLoading ? (
                                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                            ) : (
                                <div>
                                    {orderData.type === 'buy' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Available Balance:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                ₹{accountDetails?.balance.toLocaleString() ?? 0}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-gray-600 dark:text-gray-400">Available Quantity:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {availableQuantity.toLocaleString()} shares
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => handleOrderTypeChange('buy')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${orderData.type === 'buy'
                                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Buy
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOrderTypeChange('sell')}
                            className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${orderData.type === 'sell'
                                ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Sell
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quantity
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            max={orderData.type === 'sell' ? availableQuantity : undefined}
                            value={orderData.quantity}
                            onChange={(e) => handleInputChange('quantity', e.target.value ? Number(e.target.value) : 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-right"
                            placeholder="0"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Price per share
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={orderData.price}
                                onChange={(e) => handleInputChange('price', e.target.value ? Number(e.target.value) : 0)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-right"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        {total > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                    ₹{total.toLocaleString()}
                                </div>
                                {orderData.type === 'buy' && total > (accountDetails?.balance ?? 0) && (
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Insufficient balance
                                    </div>
                                )}
                                {orderData.type === 'sell' && typeof orderData.quantity === 'number' && orderData.quantity > availableQuantity && (
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Insufficient quantity
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-3">
                        <button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={!isValidOrder() || isPlacingOrder || isAccountLoading || !connected}
                            className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-all ${orderData.type === 'buy'
                                ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                                : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400'
                                } disabled:cursor-not-allowed`}
                        >
                            {isPlacingOrder ? (
                                'Placing Order...'
                            ) : !connected ? (
                                'Disconnected'
                            ) : (
                                `Place ${orderData.type === 'buy' ? 'Buy' : 'Sell'} Order`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderForm;