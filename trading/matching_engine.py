import asyncio
import logging
from typing import List, Dict, Any
from decimal import Decimal
from django.db import transaction
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
import json
from datetime import datetime
import uuid
from collections import defaultdict
from asgiref.sync import sync_to_async

from accounts.models import Holding

User = get_user_model()
logger = logging.getLogger(__name__)

class OrderMatchingEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OrderMatchingEngine, cls).__new__(cls)
            cls._instance.buy_orders: List[Dict[str, Any]] = []
            cls._instance.sell_orders: List[Dict[str, Any]] = []
            cls._instance.connected_trading_consumers = set()
            cls._instance._periodic_task = None
            cls._instance._is_running = False
            cls._instance.broadcast_interval = 1
        return cls._instance

    def add_trading_consumer(self, channel_name):
        self.connected_trading_consumers.add(channel_name)
        consumer_count = len(self.connected_trading_consumers)
        
        if consumer_count == 1 and not self._is_running:
            self._start_periodic_broadcasting()

    def remove_trading_consumer(self, channel_name):
        self.connected_trading_consumers.discard(channel_name)
        consumer_count = len(self.connected_trading_consumers)
        
        if consumer_count == 0 and self._is_running:
            self._stop_periodic_broadcasting()

    def _start_periodic_broadcasting(self):
        if self._periodic_task is not None and not self._periodic_task.done():
            return
        
        self._is_running = True
        self._periodic_task = asyncio.create_task(self._periodic_orderbook_broadcast())

    def _stop_periodic_broadcasting(self):
        self._is_running = False
        if self._periodic_task and not self._periodic_task.done():
            self._periodic_task.cancel()

    async def _periodic_orderbook_broadcast(self):
        try:
            while self._is_running:
                if self.connected_trading_consumers:
                    await self._broadcast_orderbook()
                else:
                    break
                
                await asyncio.sleep(self.broadcast_interval)
        except asyncio.CancelledError:
            logger.info("Periodic orderbook broadcasting cancelled")
        except Exception as e:
            logger.error(f"Error in periodic orderbook broadcasting: {e}", exc_info=True)
        finally:
            self._is_running = False

    async def _broadcast_orderbook(self):
        if not self.connected_trading_consumers:
            return

        channel_layer = get_channel_layer()
        orderbook_data = self.get_orderbook()
        message = json.dumps({'type': 'orderbook', 'data': orderbook_data})

        tasks = []
        for channel_name in list(self.connected_trading_consumers):
            task = channel_layer.send(channel_name, {
                "type": "orderbook.update",
                "message": message
            })
            tasks.append(task)

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def add_order(self, order_data: Dict) -> Dict:
        order = {
            'id': str(uuid.uuid4()),
            'user_id': order_data['user_id'],
            'user_email': order_data.get('user_email', 'N/A'),
            'symbol': order_data['symbol'],
            'order_type': order_data['order_type'].upper(),
            'price': float(order_data['price']),
            'quantity': int(order_data['quantity']),
            'filled_quantity': 0,
            'remaining_quantity': int(order_data['quantity']),
            'status': 'PENDING',
            'created_at': datetime.now().isoformat()+'Z'
        }

        if order['order_type'] == 'BUY':
            self.buy_orders.append(order)
            self.buy_orders.sort(key=lambda x: (-x['price'], x['created_at']))
        else:
            self.sell_orders.append(order)
            self.sell_orders.sort(key=lambda x: (x['price'], x['created_at']))

        matches = await self._match_orders()
        
        return {
            'order': order,
            'matches': matches
        }

    async def _match_orders(self) -> List[Dict]:
        matches = []
        
        while self.buy_orders and self.sell_orders:
            best_buy = self.buy_orders[0]
            best_sell = self.sell_orders[0]
            
            if best_buy['price'] < best_sell['price']:
                break

            trade_quantity = min(best_buy['remaining_quantity'], best_sell['remaining_quantity'])
            trade_price = best_sell['price']
            
            try:
                trade_result = await self._execute_trade_in_db(
                    best_buy, best_sell, trade_quantity, trade_price
                )
                
                if not trade_result['success']:
                    break
                
                buyer = trade_result['buyer']
                seller = trade_result['seller']
                total_amount = trade_result['total_amount']

                best_buy['filled_quantity'] += trade_quantity
                best_buy['remaining_quantity'] -= trade_quantity
                best_sell['filled_quantity'] += trade_quantity
                best_sell['remaining_quantity'] -= trade_quantity

                if best_buy['remaining_quantity'] == 0:
                    best_buy['status'] = 'FILLED'
                    self.buy_orders.pop(0)
                else:
                    best_buy['status'] = 'PARTIALLY_FILLED'

                if best_sell['remaining_quantity'] == 0:
                    best_sell['status'] = 'FILLED'
                    self.sell_orders.pop(0)
                else:
                    best_sell['status'] = 'PARTIALLY_FILLED'

                trade_info = {
                    'trade_id': str(uuid.uuid4()),
                    'symbol': best_buy['symbol'],
                    'price': trade_price,
                    'quantity': trade_quantity,
                    'total_amount': float(total_amount),
                    'buyer_id': best_buy['user_id'],
                    'seller_id': best_sell['user_id'],
                    'buyer_email': best_buy['user_email'],
                    'seller_email': best_sell['user_email'],
                    'created_at': datetime.now().isoformat()+'Z'
                }
                matches.append(trade_info)

                asyncio.create_task(self._notify_user_update(buyer, 'BUY', trade_info))
                asyncio.create_task(self._notify_user_update(seller, 'SELL', trade_info))

            except Exception as e:
                break

        return matches

    @sync_to_async
    def _execute_trade_in_db(self, best_buy, best_sell, trade_quantity, trade_price):
        try:
            with transaction.atomic():
                buyer = User.objects.select_for_update().get(id=best_buy['user_id'])
                seller = User.objects.select_for_update().get(id=best_sell['user_id'])
                
                total_amount = Decimal(str(trade_price)) * Decimal(trade_quantity)

                buyer_paid_price = Decimal(str(best_buy['price']))
                buyer_paid_amount = buyer_paid_price * Decimal(trade_quantity)
                actual_cost = total_amount
                
                if buyer_paid_amount > actual_cost:
                    refund_amount = buyer_paid_amount - actual_cost
                    buyer.balance += refund_amount
                    buyer.save()

                holding, created = Holding.objects.get_or_create(
                    user=buyer, 
                    symbol=best_buy['symbol'],
                    defaults={
                        'quantity': 0,
                        'price': Decimal(str(trade_price)),
                        'total': Decimal('0.0')
                    }
                )
                
                if not created:
                    new_quantity = holding.quantity + trade_quantity
                    new_total = holding.total + total_amount
                    holding.price = new_total / new_quantity if new_quantity > 0 else Decimal(str(trade_price))
                    holding.quantity = new_quantity
                    holding.total = new_total
                else:
                    holding.quantity = trade_quantity
                    holding.price = Decimal(str(trade_price))
                    holding.total = total_amount
                
                holding.save()

                seller.balance += total_amount
                seller.save()
                
                return {
                    'success': True,
                    'buyer': buyer,
                    'seller': seller,
                    'total_amount': total_amount
                }

        except User.DoesNotExist as e:
            return {'success': False, 'error': 'User not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _notify_user_update(self, user: User, side: str, trade_info: Dict):
        if not self.connected_trading_consumers:
            return

        channel_layer = get_channel_layer()
        holdings = await self._get_user_holdings(user.id)
        
        update_data = {
            'type': 'trade_executed',
            'data': {
                'message': f'Trade executed successfully',
                'balance': float(user.balance),
                'holdings': holdings,
                'trade': {
                    'trade_id': trade_info['trade_id'],
                    'side': side,
                    'symbol': trade_info['symbol'],
                    'price': trade_info['price'],
                    'quantity': trade_info['quantity'],
                    'total_amount': trade_info['total_amount'],
                    'counterparty': trade_info['seller_email'] if side == 'BUY' else trade_info['buyer_email']
                },
                'timestamp': datetime.now().isoformat()+'Z'
            }
        }
        
        message = json.dumps(update_data)

        tasks = []
        for channel_name in list(self.connected_trading_consumers):
            task = channel_layer.send(channel_name, {
                "type": "user.update",
                "message": message,
                "user_id": user.id
            })
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    @sync_to_async
    def _get_user_holdings(self, user_id: int) -> List[Dict]:
        try:
            holdings = Holding.objects.filter(user_id=user_id)
            return [
                {
                    'symbol': h.symbol,
                    'quantity': h.quantity,
                    'price': float(h.price),
                    'total': float(h.total)
                }
                for h in holdings
            ]
        except Exception as e:
            return []

    def _aggregate_orders_by_price(self, orders: List[Dict], limit: int = 5) -> List[Dict]:
        price_levels = defaultdict(lambda: {'quantity': 0, 'orders': 0})
        
        for order in orders:
            price = order['price']
            price_levels[price]['quantity'] += order['remaining_quantity']
            price_levels[price]['orders'] += 1

        aggregated = []
        for price, data in price_levels.items():
            aggregated.append({
                'price': price,
                'quantity': data['quantity'],
                'orders': data['orders']
            })
        
        return aggregated[:limit]

    def get_orderbook(self) -> Dict:
        top_buy_orders = self.buy_orders[:10]
        bids = self._aggregate_orders_by_price(top_buy_orders, 5)
        bids.sort(key=lambda x: -x['price'])
        
        top_sell_orders = self.sell_orders[:10]
        asks = self._aggregate_orders_by_price(top_sell_orders, 5)
        asks.sort(key=lambda x: x['price'])
        
        return {
            'symbol': 'RELIANCE',
            'bids': bids,
            'asks': asks,
            'timestamp': datetime.now().isoformat()+'Z'
        }

matching_engine = OrderMatchingEngine()