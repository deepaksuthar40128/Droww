import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

class FakeDataManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FakeDataManager, cls).__new__(cls)
            cls._instance.is_running = False
            cls._instance.connected_consumers = set()
            cls._instance._data_task = None
            cls._instance.initial_open = 2795.25
            cls._instance.previous_close = 2795.25
            cls._instance.reliance_data = {
                'symbol': 'RELIANCE',
                'ltp': 2800.50,
                'open': 2795.25,
                'high': 2825.75,
                'low': 2785.30,
                'volume': 1250000,
                'change': 5.25,
                'change_percent': 0.19
            }
        return cls._instance

    async def start(self):
        if self.is_running:
            return
            
        self.is_running = True
        self._data_task = asyncio.create_task(self._generate_dummy_data())

    async def stop(self):
        if not self.is_running:
            return
            
        self.is_running = False
        
        if self._data_task:
            self._data_task.cancel()
            try:
                await self._data_task
            except asyncio.CancelledError:
                pass
            
        self.connected_consumers.clear()

    def _get_random_change(self, current_value, max_percent=2.0):
        if random.random() < 0.8:
            change_percent = random.uniform(-max_percent, max_percent)
        else:
            change_percent = random.uniform(-max_percent * 2, max_percent * 2)
        
        change_value = current_value * (change_percent / 100)
        return round(current_value + change_value, 2)

    def generate_historical_data(self, count=250, interval_seconds=5):
        historical_data = []
        current_time = datetime.now()
        current_price = self.reliance_data['ltp']
        current_volume = self.reliance_data['volume']
        
        num_candles = count // 10
        if num_candles < 5:
            num_candles = 5

        starting_price = current_price + random.uniform(-40, -15) 

        candle_prices = []
        for i in range(num_candles):
            progress = i / (num_candles - 1) if num_candles > 1 else 0
            trend_price = starting_price + (current_price - starting_price) * progress
            actual_price = trend_price + random.uniform(-50, 50)
            candle_prices.append(round(actual_price, 2))

        total_ticks = 0
        for candle_idx, candle_base_price in enumerate(candle_prices):
            ticks_in_candle = random.randint(8, 12)
            
            candle_start_time = current_time - timedelta(seconds=(num_candles - candle_idx) * interval_seconds)

            candle_high = candle_base_price + random.uniform(1, 4)
            candle_low = candle_base_price - random.uniform(1, 4)

            if candle_idx == 0:
                candle_open = starting_price
            else:
                candle_open = candle_prices[candle_idx - 1] + random.uniform(-0.5, 0.5)
            
            for tick_idx in range(ticks_in_candle):
                tick_offset = (tick_idx / ticks_in_candle) * interval_seconds
                tick_time = candle_start_time + timedelta(seconds=tick_offset)
                
                if tick_idx == 0:
                    tick_price = candle_open
                elif tick_idx == ticks_in_candle - 1:
                    tick_price = candle_base_price + random.uniform(-0.5, 0.5)
                else:
                    tick_price = candle_base_price + random.uniform(
                        candle_low - candle_base_price, 
                        candle_high - candle_base_price
                    )
                
                tick_price = round(max(candle_low, min(candle_high, tick_price)), 2)
                
                base_volume = current_volume + random.randint(-200000, 200000)
                tick_volume = max(50000, base_volume // ticks_in_candle + random.randint(-10000, 10000))
                
                change = round(tick_price - self.initial_open, 2)
                change_percent = round((change / self.initial_open) * 100, 2) if self.initial_open > 0 else 0
                
                data_point = {
                    'symbol': 'RELIANCE',
                    'ltp': tick_price,
                    'open': self.reliance_data['open'],
                    'high': tick_price,
                    'low': tick_price, 
                    'volume': tick_volume,
                    'change': change,
                    'change_percent': change_percent,
                    'timestamp': tick_time.isoformat() + 'Z'
                }
                
                historical_data.append(data_point)
                total_ticks += 1
                
                if total_ticks >= count:
                    break
            
            if total_ticks >= count:
                break
        
        historical_data.sort(key=lambda x: x['timestamp'])
        
        historical_data = historical_data[:count]
        
        return historical_data

    async def send_initial_data(self, channel_name):
        try:
            channel_layer = get_channel_layer()
            historical_data = self.generate_historical_data()
            
            initial_message = {
                'type': 'market_data_start',
                'data': historical_data
            }
            
            await channel_layer.send(
                channel_name,
                {
                    "type": "initial.data",
                    "message": json.dumps(initial_message)
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending initial data to {channel_name}: {e}")

    async def _generate_dummy_data(self):
        channel_layer = get_channel_layer()
        
        while self.is_running:
            try:
                old_price = self.reliance_data['ltp']
                self.reliance_data['ltp'] = self._get_random_change(self.reliance_data['ltp'], 0.8)

                if self.reliance_data['ltp'] > self.reliance_data['high']:
                    self.reliance_data['high'] = self.reliance_data['ltp']
                if self.reliance_data['ltp'] < self.reliance_data['low']:
                    self.reliance_data['low'] = self.reliance_data['ltp']

                tick_volume = random.randint(20000, 80000)
                
                self.reliance_data['change'] = round(self.reliance_data['ltp'] - self.initial_open, 2)
                if self.initial_open > 0:
                    self.reliance_data['change_percent'] = round((self.reliance_data['change'] / self.initial_open) * 100, 2)

                market_data = {
                    'type': 'market_data',
                    'data': {
                        'symbol': self.reliance_data['symbol'],
                        'ltp': self.reliance_data['ltp'],
                        'open': self.reliance_data['open'],
                        'high': self.reliance_data['ltp'], 
                        'low': self.reliance_data['ltp'], 
                        'volume': tick_volume,            
                        'change': self.reliance_data['change'],
                        'change_percent': self.reliance_data['change_percent'],
                        'timestamp': datetime.now().isoformat()+'Z'
                    }
                }
                
                orderbook_data = self._generate_orderbook_data()
                trade_data = self._generate_trade_data()
                
                if self.connected_consumers:
                    for consumer_channel_name in list(self.connected_consumers):
                        try:
                            await channel_layer.send(
                                consumer_channel_name,
                                {
                                    "type": "market.data", 
                                    "message": json.dumps(market_data)
                                }
                            )
                            
                            await channel_layer.send(
                                consumer_channel_name,
                                {
                                    "type": "orderbook.data", 
                                    "message": json.dumps(orderbook_data)
                                }
                            )
                            
                            await channel_layer.send(
                                consumer_channel_name,
                                {
                                    "type": "trade.data", 
                                    "message": json.dumps(trade_data)
                                }
                            )
                                
                        except Exception as e:
                            self.connected_consumers.discard(consumer_channel_name)
                
                await asyncio.sleep(random.uniform(0.3, 0.8))
                
            except Exception as e:
                await asyncio.sleep(2)

    def _generate_orderbook_data(self):
        current_price = self.reliance_data['ltp']
        
        bids = []
        for i in range(5):
            price = round(current_price - (i + 1) * random.uniform(0.25, 1.0), 2)
            quantity = random.randint(100, 2000)
            bids.append({
                'price': price,
                'quantity': quantity,
                'orders': random.randint(1, 10)
            })
        
        asks = []
        for i in range(5):
            price = round(current_price + (i + 1) * random.uniform(0.25, 1.0), 2)
            quantity = random.randint(100, 2000)
            asks.append({
                'price': price,
                'quantity': quantity,
                'orders': random.randint(1, 10)
            })
        
        return {
            'type': 'orderbook',
            'data': {
                'symbol': 'RELIANCE',
                'bids': bids,
                'asks': asks,
                'timestamp': datetime.now().isoformat()+'Z'
            }
        }
    
    def _generate_trade_data(self):
        current_price = self.reliance_data['ltp']
        
        trade_price = self._get_random_change(current_price, 0.5)
        trade_quantity = random.randint(50, 1000)
        trade_side = random.choice(['BUY', 'SELL'])
        
        return {
            'type': 'trade',
            'data': {
                'symbol': 'RELIANCE',
                'price': trade_price,
                'quantity': trade_quantity,
                'side': trade_side,
                'trade_id': f"T{random.randint(100000, 999999)}",
                'timestamp': datetime.now().isoformat()+'Z'
            }
        }

    def add_consumer(self, channel_name):
        self.connected_consumers.add(channel_name)

    def remove_consumer(self, channel_name):
        self.connected_consumers.discard(channel_name)

fake_data_manager = FakeDataManager()