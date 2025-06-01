import {ChartOrderBookDataType} from "@/pages/home/home.tsx";
import {Switch} from "@/components/ui/switch.tsx";

interface OrderBookRowData {
    price: number;
    quantity: number;
    orders: number;
    type: 'ask' | 'bid';
    maxQuantity: number;
}

const OrderBookRow = ({price, quantity, orders, type, maxQuantity}: OrderBookRowData) => {
    const percentage = (quantity / maxQuantity) * 100;
    const isAsk = type === 'ask';

    return (
        <div
            className="relative flex items-center justify-between py-2 px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div
                className={`absolute inset-y-0 ${isAsk ? 'right-0 bg-red-50 dark:bg-red-900/20' : 'left-0 bg-green-50 dark:bg-green-900/20'} transition-all duration-300`}
                style={{width: `${percentage}%`}}
            />
            <div className="relative z-10 flex items-center justify-between w-full">
                <span
                    className={`font-mono font-medium ${isAsk ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ₹{price.toFixed(2)}
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-mono">
                    {quantity.toLocaleString()}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs pr-4">
                    {orders}
                </span>
            </div>
        </div>
    );
};


const OrderBook = ({orderBookData, fakeOrderBook, setFakeOrderBook}: {
    orderBookData: ChartOrderBookDataType,
    fakeOrderBook: boolean,
    setFakeOrderBook: React.Dispatch<React.SetStateAction<boolean>>
}) => {
    const {data} = orderBookData;
    const sortedAsks = [...data.asks].sort((a, b) => a.price - b.price);

    const sortedBids = [...data.bids].sort((a, b) => b.price - a.price);

    const allQuantities = [...data.asks, ...data.bids].map(item => item.quantity);
    const maxQuantity = Math.max(...allQuantities);

    const bestBid = Math.max(...data.bids.map(b => b.price));
    const bestAsk = Math.min(...data.asks.map(a => a.price));
    const spread = bestAsk - bestBid;
    const spreadPercentage = ((spread / bestBid) * 100).toFixed(3);

    const formatTimestamp = (timestamp: string | Date | number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div
            className="w-full mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-1 border-b h-16 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Order Book</h2>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{data.symbol}</span>
                </div>
                <div
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-2 justify-between">
                    <span>Last updated: {formatTimestamp(data.timestamp)}</span>
                    <div className="flex items-center justify-center"> Fake Order Book:
                        <Switch checked={fakeOrderBook} onCheckedChange={c => setFakeOrderBook(c)} className="ml-2"/>
                    </div>
                </div>
            </div>

            <div
                className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <span>Price</span>
                <span>Quantity</span>
                <span>Orders</span>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <div
                    className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                    ASKS (Sell Orders)
                </div>
                {
                    !sortedAsks.length && <div className="px-3 py-2 text-sm text-gray-500">No data available</div>
                }
                {sortedAsks.slice(0, 10).reverse().map((ask, index) => (
                    <OrderBookRow
                        key={`ask-${index}`}
                        price={ask.price}
                        quantity={ask.quantity}
                        orders={ask.orders}
                        type="ask"
                        maxQuantity={maxQuantity}
                    />
                ))}
            </div>

            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Spread:</span>
                    <div className="text-right">
                        <span className="font-mono text-gray-800 dark:text-gray-200">₹{spread.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({spreadPercentage}%)</span>
                    </div>
                </div>
            </div>

            <div>
                <div
                    className="px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                    BIDS (Buy Orders)
                </div>
                {
                    !sortedAsks.length && <div className="px-3 py-2 text-sm text-gray-500">No data available</div>
                }
                {sortedBids.slice(0, 10).map((bid, index) => (
                    <OrderBookRow
                        key={`bid-${index}`}
                        price={bid.price}
                        quantity={bid.quantity}
                        orders={bid.orders}
                        type="bid"
                        maxQuantity={maxQuantity}
                    />
                ))}
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                    <div className="text-center">
                        <div className="text-green-600 dark:text-green-400 font-semibold">₹{bestBid.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Best Bid</div>
                    </div>
                    <div className="text-center">
                        <div className="text-red-600 dark:text-red-400 font-semibold">₹{bestAsk.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Best Ask</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderBook;