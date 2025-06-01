import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './chart.css'

export interface CandlestickData {
    symbol: string;
    ltp: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    change: number;
    change_percent: number;
    timestamp: string;
    bucketTime: string;
    datumKey: string;
}

export interface ChartDimensions {
    width: number;
    height: number;
}

interface DynamicCandlestickChartProps {
    data: CandlestickData[];
    dimension: ChartDimensions
}

const DynamicCandlestickChart: React.FC<DynamicCandlestickChartProps> = ({
    data = [],
    dimension,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const animationFrameRef = useRef<number>();
    const lastDataLengthRef = useRef(0);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const triggerAnimation = useCallback(() => {
        if (!isVisible) return;

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
    }, [isVisible]);

    useEffect(() => {
        if (data.length > lastDataLengthRef.current && isVisible) {
            triggerAnimation();
        }
        lastDataLengthRef.current = data.length;
    }, [data.length, triggerAnimation, isVisible]);

    const margin = { top: 20, right: 60, bottom: 60, left: 60 }

    const renderChart = useCallback(() => {
        if (data.length === 0 || !isVisible) return;

        const width = dimension.width - margin.left - margin.right;
        const height = dimension.height - margin.top - margin.bottom;
        const svg = d3.select(svgRef.current);

        svg.selectAll("*").remove();

        const g = svg.append('g')
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .classed('main-group', true);

        const xExtent = d3.extent(data, d => new Date(d.bucketTime)) as [Date, Date];
        const xDomain = xExtent[0] && xExtent[1] ? [xExtent[0], xExtent[1]] : [new Date(), new Date()];
        const xScale = d3.scaleTime().domain(xDomain).range([20, width - 20]);
        const xGridScale = d3.scaleTime().domain(xDomain).range([0, width]);

        const yValues = data.flatMap(d => [d.low, d.high]);
        const yDomain = d3.extent(yValues) as [number, number];
        if (!yDomain[0] || !yDomain[1]) return;

        const yScale = d3.scaleLinear().domain(yDomain).nice().range([height, 0]);

        const xAxisTicks = xGridScale.ticks(6);
        g.selectAll(".x-tick")
            .data(xAxisTicks)
            .enter()
            .append("text")
            .attr("class", "x-tick chart-text")
            .attr("x", d => xGridScale(d))
            .attr("y", height + 20)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(d => d3.timeFormat("%H:%M")(d));

        g.append("line")
            .attr("class", "x-axis-line chart-line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", height)
            .attr("y2", height);

        const yAxis = g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale).ticks(8));

        yAxis.selectAll("text")
            .attr("class", "chart-text");

        yAxis.selectAll("line")
            .attr("class", "chart-line");

        yAxis.select(".domain")
            .attr("class", "chart-line");

        const xGrid = g.append('g')
            .classed("grid x-grid", true)
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xGridScale).tickSize(-height).tickFormat(() => "").ticks(6));

        xGrid.selectAll("line")
            .attr("class", "chart-grid-line")
            .style("stroke-dasharray", "3,3");

        xGrid.select(".domain").remove();

        const yGrid = g.append('g')
            .classed("grid y-grid", true)
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => "").ticks(8));

        yGrid.selectAll("line")
            .attr("class", "chart-grid-line")
            .style("stroke-dasharray", "3,3");

        yGrid.select(".domain").remove();

        g.append('text')
            .classed("axis-label y-label chart-text", true)
            .attr("transform", `translate(${margin.left / 6}, -10) rotate(-90)`)
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Price");

        g.append('text')
            .classed("axis-label x-label chart-text", true)
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Time");

        const candleWidth = Math.max(3, Math.min(15, (width / data.length) * 0.6));

        const candles = g.selectAll<SVGGElement, CandlestickData>(".candle")
            .data(data, (d: CandlestickData) => d.datumKey)
            .enter()
            .append("g")
            .attr("class", "candle")
            .attr("transform", d => `translate(${xScale(new Date(d.bucketTime))}, 0)`);

        candles.append("line")
            .classed("high-low", true)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", d => yScale(d.high))
            .attr("y2", d => yScale(d.low))
            .style("stroke", d => d.ltp >= d.open ? "#16a34a" : "#dc2626")
            .style("stroke-width", 1.5);

        candles.append("rect")
            .classed('candle-body', true)
            .attr("x", -candleWidth / 2)
            .attr("y", d => yScale(Math.max(d.open, d.ltp)))
            .attr("width", candleWidth)
            .attr("height", d => Math.max(1, Math.abs(yScale(d.open) - yScale(d.ltp))))
            .style("fill", d => d.ltp >= d.open ? "#22c55e" : "#ef4444")
            .style("stroke", d => d.ltp >= d.open ? "#16a34a" : "#dc2626")
            .style("stroke-width", 1)
            .attr("rx", 1);

        if (isAnimating) {
            const newCandles = candles.filter((_, i) => i >= data.length - 3);
            newCandles
                .style("opacity", 0)
                .transition()
                .duration(200)
                .style("opacity", 1);
        }

    }, [data, margin, isAnimating, isVisible, dimension]);

    useEffect(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(renderChart);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [renderChart]);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white h-fit w-fit">
            {!isVisible && (
                <div
                    className="fixed top-4 right-4 bg-yellow-500 dark:bg-yellow-600 text-white px-4 py-2 rounded-sm">
                    Chart paused (tab inactive)
                </div>
            )}
            <div className="flex justify-center">
                <div className="relative">
                    <svg
                        ref={svgRef}
                        width={dimension.width}
                        height={dimension.height}
                        className="border border-gray-300 dark:border-gray-600 rounded-sm bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                    />
                </div>
            </div>

            <div className="flex justify-center mt-6 text-sm">
                <div
                    className="flex gap-8 bg-gray-100 dark:bg-gray-800 p-4 rounded-sm border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-5 h-4 bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-700 rounded shadow-green-500/30 dark:shadow-green-500/50 shadow-sm"></div>
                        <span className="text-gray-700 dark:text-gray-200">Bullish</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-5 h-4 bg-red-400 dark:bg-red-500 border border-red-500 dark:border-red-600 rounded shadow-red-500/30 dark:shadow-red-500/50 shadow-sm"></div>
                        <span className="text-gray-700 dark:text-gray-200">Bearish</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DynamicCandlestickChart;