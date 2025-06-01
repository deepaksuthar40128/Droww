import { useEffect, useState } from 'react';
import { ChevronDown, Maximize2, Minimize2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { CandleData } from "@/pages/home/components/chartEngine.tsx";

interface HomeHeaderProps {
    primaryStock: CandleData;
    onRefresh?: () => void;
}

const HomeHeader = ({ primaryStock, onRefresh }: HomeHeaderProps) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                setIsFullScreen(true);
            });
        } else {
            document.exitFullscreen().catch(() => {
                setIsFullScreen(false);
            });
        }
        setIsFullScreen(!isFullScreen);
    };

    const formatVolume = (volume: number): string => {
        if (volume >= 10000000) {
            return `${(volume / 10000000).toFixed(2)}Cr`;
        } else if (volume >= 100000) {
            return `${(volume / 100000).toFixed(2)}L`;
        } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(2)}K`;
        }
        return volume.toString();
    };

    const formatValue = (price: number, volume: number): string => {
        const value = (price * volume) / 10000000; // Convert to Crores
        return `${value.toFixed(2)}`;
    };

    const getCompanyName = (symbol: string): string => {
        const companyNames: { [key: string]: string } = {
            'RELIANCE': 'Reliance Industries',
            'TCS': 'Tata Consultancy Services',
            'HDFCBANK': 'HDFC Bank',
            'INFY': 'Infosys',
            'ICICIBANK': 'ICICI Bank',
            'HINDUNILVR': 'Hindustan Unilever',
            'ITC': 'ITC Limited',
            'SBIN': 'State Bank of India',
            'BHARTIARTL': 'Bharti Airtel',
            'ASIANPAINT': 'Asian Paints',
            'MARUTI': 'Maruti Suzuki',
            'KOTAKBANK': 'Kotak Mahindra Bank',
            'LT': 'Larsen & Toubro',
            'AXISBANK': 'Axis Bank',
            'HCLTECH': 'HCL Technologies'
        };
        return companyNames[symbol] || symbol;
    };

    const getCompanyInitials = (symbol: string): string => {
        if (symbol === 'RELIANCE') return 'RIL';
        if (symbol === 'TCS') return 'TCS';
        if (symbol === 'HDFCBANK') return 'HDB';
        if (symbol === 'INFY') return 'INF';
        return symbol.substring(0, 3);
    };

    const tickerData = [
        { symbol: 'RELIANCE', change: -1.25, isPositive: false },
        { symbol: 'TCS', change: +2.15, isPositive: true },
        { symbol: 'HDFCBANK', change: -0.85, isPositive: false },
        { symbol: 'INFY', change: +1.75, isPositive: true },
        { symbol: 'ICICIBANK', change: +0.95, isPositive: true },
        { symbol: 'HINDUNILVR', change: -2.10, isPositive: false },
        { symbol: 'ITC', change: +3.25, isPositive: true },
        { symbol: 'SBIN', change: -1.45, isPositive: false },
        { symbol: 'BHARTIARTL', change: +2.80, isPositive: true },
        { symbol: 'ASIANPAINT', change: -3.15, isPositive: false },
        { symbol: 'MARUTI', change: +1.55, isPositive: true },
        { symbol: 'KOTAKBANK', change: -0.75, isPositive: false },
        { symbol: 'LT', change: +2.35, isPositive: true },
        { symbol: 'AXISBANK', change: -1.85, isPositive: false },
        { symbol: 'HCLTECH', change: +4.20, isPositive: true }
    ];

    const TickerItem = ({ symbol, change, isPositive }: { symbol: string, change: number, isPositive: boolean }) => (
        <div
            className="flex items-center space-x-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200">
            <span className="text-gray-800 dark:text-gray-200 font-medium text-sm whitespace-nowrap">{symbol}</span>
            <span
                className={`text-sm font-medium whitespace-nowrap ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex animate-scroll">
                    <div className="flex items-center py-2 space-x-6 min-w-max">
                        {[...tickerData, ...tickerData].map((item, index) => (
                            <TickerItem
                                key={`${item.symbol}-${index}`}
                                symbol={item.symbol}
                                change={item.change}
                                isPositive={item.isPositive}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                                <span
                                    className="text-white font-bold text-sm">{getCompanyInitials(primaryStock.symbol)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {getCompanyName(primaryStock.symbol)}
                                </h1>
                                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <span
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded font-medium">
                                NSE
                            </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <span
                                className="text-3xl font-bold text-gray-900 dark:text-white">₹{primaryStock.ltp.toLocaleString('en-IN')}</span>
                            <div
                                className={`flex items-center space-x-1 ${primaryStock.change_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {primaryStock.change_percent >= 0 ? <TrendingUp className="w-4 h-4" /> :
                                    <TrendingDown className="w-4 h-4" />}
                                <span
                                    className="font-medium">{primaryStock.change_percent >= 0 ? '+' : ''}{primaryStock.change_percent.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Market Time (IST)</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {currentTime.toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    timeZone: 'Asia/Kolkata'
                                })}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                            <button
                                onClick={handleRefresh}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Refresh Price"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                                onClick={toggleFullScreen}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullScreen ?
                                    <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" /> :
                                    <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                }
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-8 gap-6 text-sm">
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Day change%</div>
                        <div
                            className={`font-medium ${primaryStock.change_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {primaryStock.change_percent >= 0 ? '+' : ''}{primaryStock.change_percent.toFixed(2)}%
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Previous close</div>
                        <div className="text-gray-900 dark:text-white font-medium">
                            ₹{(primaryStock.ltp - primaryStock.change).toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1 flex items-center space-x-1">
                            <span>Open price</span>
                        </div>
                        <div
                            className="text-gray-900 dark:text-white font-medium">₹{primaryStock.open.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Day high</div>
                        <div
                            className="text-gray-900 dark:text-white font-medium">₹{primaryStock.high.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Day low</div>
                        <div
                            className="text-gray-900 dark:text-white font-medium">₹{primaryStock.low.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Volume (shares)</div>
                        <div
                            className="text-gray-900 dark:text-white font-medium">{formatVolume(primaryStock.volume)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Value (₹ Cr)</div>
                        <div
                            className="text-gray-900 dark:text-white font-medium">{formatValue(primaryStock.ltp, primaryStock.volume)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Last Updated</div>
                        <div className="text-gray-900 dark:text-white font-medium">
                            {new Date(primaryStock.timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }

                .animate-scroll {
                    animation: scroll 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default HomeHeader;