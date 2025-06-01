import HomeHeader from "@/pages/home/components/homeHeader.tsx";
import ChartEngine, { BucketSize, CandleData, getBucketSizeMs } from "@/pages/home/components/chartEngine.tsx";
import { useWebSocket } from "@/hooks/useWebSocket.ts";
import { WebSocketURL } from "@/lib/types.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Loader from "@/components/Loader/Loader.tsx";
import BucketSizeSelector from "@/pages/home/components/bucketSelector.tsx";
import OrderBook from "@/pages/home/components/orderBookViewer.tsx";
import OrderForm from "@/pages/home/components/orderForm.tsx";

const CANDLE_COUNT = 50;
const FETCH_DATA_INTERVAL = 500;

const Home = () => {
    const [orderBookData, setOrderBookData] = useState<ChartOrderBookDataType | null>(null);
    const [fakeOrderBook, setFakeOrderBook] = useState<boolean>(true);
    const [dataPoints, setDataPoints] = useState<CandleData[]>([]);
    const [bucketSize, setBucketSize] = useState<BucketSize>('5s');
    const [isPageVisible, setIsPageVisible] = useState(true);
    const dataQueueRef = useRef<CandleData[]>([]);
    const processingRef = useRef(false);

    const datapointRequired = useMemo(() => {
        return getBucketSizeMs(bucketSize) / FETCH_DATA_INTERVAL * CANDLE_COUNT + 10;
    }, [bucketSize]);

    const handleVisibilityChange = () => {
        const visible = !document.hidden;
        setIsPageVisible(visible);

        if (visible && dataQueueRef.current.length > 0) {
            processQueuedData();
        }
    };
    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const processQueuedData = useCallback(() => {
        if (processingRef.current) return;
        processingRef.current = true;

        const queuedData: CandleData[] = [];
        dataQueueRef.current.forEach(data => {
            queuedData.push({ ...data })
        })

        setDataPoints(prev => {
            const combined = [...prev, ...queuedData];
            if (combined.length > datapointRequired) {
                return combined.splice(-datapointRequired);
            }
            return combined;
        });
        dataQueueRef.current = [];
        processingRef.current = false;
    }, []);

    const updateDataPoints = useCallback((newData: CandleData) => {
        if (!isPageVisible) {
            dataQueueRef.current.push(newData);
            if (dataQueueRef.current.length > datapointRequired) {
                dataQueueRef.current.splice(0, dataQueueRef.current.length - datapointRequired);
            }
            return;
        }

        setDataPoints(prev => {
            const updated = [...prev, newData];
            if (updated.length > datapointRequired) {
                updated.splice(0, dataQueueRef.current.length - datapointRequired);
            }
            return updated;
        });
    }, [isPageVisible, datapointRequired]);

    const { connected, connection } = useWebSocket<unknown, ChartDataFeedTypes>(WebSocketURL.ChartFeed, {
        onMessage: (data) => {
            switch (data.type) {
                case ChartDataFeedType.MarketData:
                    updateDataPoints(data.data);
                    break;
                case ChartDataFeedType.OrderBook:
                    if (isPageVisible && fakeOrderBook) {
                        setOrderBookData(data);
                    }
                    break;
                case ChartDataFeedType.OldMarketData:
                    setDataPoints(data.data);
                    break;
                default:
                    return;

            }
        },
    });

    return (
        <div className="h-[calc(100dvh-60px)] flex flex-col bg-gray-50 dark:bg-gray-900">
            <div className="flex-grow-0 flex-shrink-0">
                {
                    dataPoints.length > 0 ?
                        <HomeHeader primaryStock={dataPoints[dataPoints.length - 1] || {}}
                            onRefresh={() => connection?.close()} />
                        : <Loader />
                }
            </div>
            <div className="flex-grow-0 flex-shrink-0 relative">
                {!connected && (
                    <div className="text-center w-full absolute text-white bg-red-500 p-1">
                        Stalled Feed
                    </div>
                )}
                {!isPageVisible && (
                    <div className="text-center text-white bg-yellow-600 p-2">
                        Chart paused - Page not visible ({dataQueueRef.current.length} updates queued)
                    </div>
                )}
            </div>
            <div className="flex-1 w-full flex">
                <div className="flex-grow-0 flex-shrink-0">
                    <div
                        className="flex h-16 justify-around items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <BucketSizeSelector selectedBucketSize={bucketSize} setBucketSize={setBucketSize} />
                    </div>
                    <ChartEngine
                        data={dataPoints}
                        bucketSize={bucketSize}
                        candleCount={CANDLE_COUNT}
                    />
                </div>
                <div className="flex-1">
                    {
                        orderBookData &&
                        <OrderBook orderBookData={orderBookData} fakeOrderBook={fakeOrderBook}
                            setFakeOrderBook={setFakeOrderBook} />
                    }
                    {
                        !fakeOrderBook &&
                        <OrderForm symbol="RELIANCE" setOrderBookDatum={setOrderBookData} />
                    }
                </div>
            </div>
        </div>
    );
};

export default Home;

export enum ChartDataFeedType {
    Trade = 'trade',
    OrderBook = 'orderbook',
    MarketData = 'market_data',
    OldMarketData = 'market_data_start'
}

type ChartDataFeedTypes = ChartTradeDataType | ChartOrderBookDataType | ChartMarketDataType | StartChartMarketDataType;

export interface ChartTradeDataType {
    type: ChartDataFeedType.Trade;
    data: {
        symbol: string;
        price: number;
        quantity: number;
        side: 'BUY' | 'SELL';
        trade_id: string;
        timestamp: string;
    };
}

export interface ChartOrderBookDataType {
    type: ChartDataFeedType.OrderBook;
    data: {
        symbol: string;
        bids: {
            price: number;
            quantity: number;
            orders: number;
        }[];
        asks: {
            price: number;
            quantity: number;
            orders: number;
        }[];
        timestamp: string;
    };
}

export interface ChartMarketDataType {
    type: ChartDataFeedType.MarketData;
    data: CandleData;
}

export interface StartChartMarketDataType {
    type: ChartDataFeedType.OldMarketData;
    data: CandleData[];
}