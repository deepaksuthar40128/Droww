import DynamicCandlestickChart, { CandlestickData, ChartDimensions } from "@/pages/home/components/chart.tsx";
import React, { useEffect, useMemo } from "react";

export type BucketSize = '5s' | '30s' | '1m' | '2m' | '5m' | '15m' | '30m' | '1h';

interface ChartEngineProps {
    data: CandleData[];
    bucketSize: BucketSize;
    candleCount?: number;
}

export type CandleData = Omit<CandlestickData, 'bucketTime' | 'datumKey'>;

const getDimension = (width: number, height: number): ChartDimensions => {
    if (width > height) {
        return {
            width: width * 0.6,
            height: height * 0.5
        }
    }
    return {
        width: width * 0.9,
        height: height * 0.5
    }
};

export const getBucketSizeMs = (bucketSize: BucketSize): number => {
    const sizeMap: Record<BucketSize, number> = {
        '5s': 5 * 1000,
        '30s': 30 * 1000,
        '1m': 60 * 1000,
        '2m': 2 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000
    };
    return sizeMap[bucketSize];
};

const getDatumKeyForCandle = (bucketTime: string, bucketSize: BucketSize): string => {
    return `Candles-${bucketTime}-${bucketSize}`;
};

const createBucketTime = (timestamp: string, bucketSize: BucketSize): string => {
    const date = new Date(timestamp);
    const bucketMs = getBucketSizeMs(bucketSize);

    const bucketStart = Math.floor(date.getTime() / bucketMs) * bucketMs;
    return new Date(bucketStart).toISOString();
};

const aggregateToCandles = (
    data: CandleData[],
    bucketSize: BucketSize
): CandlestickData[] => {
    if (data.length === 0) return [];
    const buckets = new Map<string, CandleData[]>();

    data.forEach(tick => {
        const bucketTime = createBucketTime(tick.timestamp, bucketSize);
        if (!buckets.has(bucketTime)) {
            buckets.set(bucketTime, []);
        }
        buckets.get(bucketTime)!.push(tick);
    });

    const candles: CandlestickData[] = [];

    for (const [bucketTime, ticks] of buckets) {
        if (ticks.length === 0) continue;

        ticks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const firstTick = ticks[0];
        const lastTick = ticks[ticks.length - 1];

        const open = firstTick.ltp;
        const close = lastTick.ltp;
        const high = Math.max(...ticks.map(t => t.ltp));
        const low = Math.min(...ticks.map(t => t.ltp));
        const volume = ticks.reduce((sum, t) => sum + (t.volume || 0), 0);

        const change = close - open;
        const changePercent = (change / open) * 100;

        candles.push({
            symbol: firstTick.symbol,
            ltp: close,
            open,
            high,
            low,
            volume,
            change,
            change_percent: changePercent,
            timestamp: lastTick.timestamp,
            bucketTime,
            datumKey: getDatumKeyForCandle(bucketTime, bucketSize)
        });
    }

    return candles.sort((a, b) =>
        new Date(a.bucketTime!).getTime() - new Date(b.bucketTime!).getTime()
    );
};

const ChartEngine: React.FC<ChartEngineProps> = ({
    data,
    bucketSize,
    candleCount = 10
}) => {

    const [dimension, setDimension] = React.useState<ChartDimensions>(getDimension(
        window.innerWidth,
        window.innerHeight
    ));

    const processedData = useMemo(() => {
        const sourceData = data;
        if (sourceData.length === 0) return [];
        const candles = aggregateToCandles(sourceData, bucketSize);

        if (candleCount && candleCount > 0) {
            return candles.slice(-candleCount);
        }

        return candles;
    }, [data, bucketSize, candleCount]);

    const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setDimension(getDimension(width, height));
    }

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [])


    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
            <DynamicCandlestickChart dimension={dimension} data={processedData} />
        </div>
    );
};

export default ChartEngine;