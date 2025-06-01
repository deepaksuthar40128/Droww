import { BucketSize } from "@/pages/home/components/chartEngine.tsx";

const BUCKET_SIZES: BucketSize[] = ['5s', '30s', '1m', '2m', '5m', '15m', '30m', '1h'];

const getBucketSizeLabel = (bucketSize: BucketSize): string => {
    const labelMap: Record<BucketSize, string> = {
        '5s': '5 Seconds',
        '30s': '30 Seconds',
        '1m': '1 Minute',
        '2m': '2 Minutes',
        '5m': '5 Minutes',
        '15m': '15 Minutes',
        '30m': '30 Minutes',
        '1h': '1 Hour'
    };
    return labelMap[bucketSize];
};

const BucketSizeSelector: React.FC<{
    selectedBucketSize: BucketSize;
    setBucketSize?: React.Dispatch<React.SetStateAction<BucketSize>>;
}> = ({ selectedBucketSize, setBucketSize }) => {
    return (
        <div
            className="flex items-center justify-center gap-2 p-4 h-full">
            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium mr-4">Time Interval:</span>
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                {BUCKET_SIZES.map((bucketSize) => (
                    <button
                        key={bucketSize}
                        onClick={() => setBucketSize?.(bucketSize)}
                        className={`
                            px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                            ${selectedBucketSize === bucketSize
                                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                            }
                        `}
                        title={getBucketSizeLabel(bucketSize)}
                    >
                        {bucketSize}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BucketSizeSelector;