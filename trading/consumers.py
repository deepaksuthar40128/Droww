import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from accounts.authentication import JWTCookieAuthentication
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .matching_engine import matching_engine
from decimal import Decimal
from django.db import transaction

User = get_user_model()
logger = logging.getLogger(__name__)

class TradingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            user = await self.get_user_from_cookie()
            if user is None or not user.is_authenticated:
                await self.close(code=4001)
                return

            self.scope['user'] = user
            await self.accept()

            matching_engine.add_trading_consumer(self.channel_name)

            await self.send(text_data=json.dumps({
                'type': 'connection_ack',
                'data': {
                    'status': 'connected',
                    'user_id': user.id,
                    'user_email': user.email,
                    'balance': float(user.balance),
                    'update_interval': '500ms'
                }
            }))

        except Exception as e:
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'channel_name'):
                matching_engine.remove_trading_consumer(self.channel_name)
            
            user = self.scope.get('user')
            user_identifier = getattr(user, 'email', 'Unknown') if user and user.is_authenticated else 'Anonymous'
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', '')
            user = self.scope.get('user')

            if not user or not user.is_authenticated:
                await self.send_error("User not authenticated")
                await self.close(code=4001)
                return

            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'place_order':
                await self.handle_place_order(data.get('data', {}))
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            await self.send_error("Internal server error")

    async def handle_place_order(self, order_data):
        user = self.scope['user']
        try:
            required_fields = ['order_type', 'price', 'quantity']
            for field in required_fields:
                if field not in order_data:
                    await self.send_order_error(f'Missing required field: {field}')
                    return
            
            price = Decimal(str(order_data['price']))
            quantity = int(order_data['quantity'])
            order_type = order_data['order_type'].upper()

            if price <= Decimal('0') or quantity <= 0:
                await self.send_order_error("Price and quantity must be positive")
                return
            if order_type not in ['BUY', 'SELL']:
                await self.send_order_error("Order type must be BUY or SELL")
                return

            if order_type == 'BUY':
                required_amount = price * Decimal(quantity)
                success = await self.deduct_balance_for_buy_order(user.id, required_amount)
                if not success:
                    await self.send_order_error(f"Insufficient balance. Required: {required_amount}")
                    return
            else:
                success = await self.deduct_holdings_for_sell_order(user.id, 'RELIANCE', quantity)
                if not success:
                    await self.send_order_error(f"Insufficient holdings for sell order")
                    return

            order_request = {
                'user_id': user.id,
                'user_email': user.email,
                'symbol': 'RELIANCE',
                'order_type': order_type,
                'price': float(price),
                'quantity': quantity
            }

            result = await matching_engine.add_order(order_request)
            
            await self.send(text_data=json.dumps({
                'type': 'order_placed_ack',
                'data': {
                    'order_id': result['order']['id'],
                    'message': 'Order placed successfully',
                    'order_type': order_type,
                    'price': float(price),
                    'quantity': quantity,
                    'matches': len(result['matches'])
                }
            }))
                
        except (ValueError, TypeError) as e:
            await self.send_order_error(f'Invalid order data: {str(e)}')
        except Exception as e:
            await self.send_order_error('Failed to place order')

    async def orderbook_update(self, event):
        try:
            await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending orderbook update: {e}")

    async def user_update(self, event):
        try:
            current_user = self.scope.get('user')
            if current_user and current_user.is_authenticated and event.get("user_id") == current_user.id:
                await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending user update: {e}")

    async def send_error(self, message):
        await self.send(text_data=json.dumps({'type': 'error', 'data': {'message': message}}))

    async def send_order_error(self, message):
        await self.send(text_data=json.dumps({'type': 'order_error', 'data': {'message': message}}))

    @database_sync_to_async
    def deduct_balance_for_buy_order(self, user_id, required_amount):
        try:
            with transaction.atomic():
                user = User.objects.select_for_update().get(id=user_id)
                if user.balance >= required_amount:
                    user.balance -= required_amount
                    user.save()
                    return True
                return False
        except User.DoesNotExist:
            return False
        except Exception as e:
            return False

    @database_sync_to_async
    def deduct_holdings_for_sell_order(self, user_id, symbol, quantity):
        try:
            from accounts.models import Holding
            with transaction.atomic():
                holding = Holding.objects.select_for_update().get(user_id=user_id, symbol=symbol)
                if holding.quantity >= quantity:
                    holding.quantity -= quantity
                    if holding.quantity <= 0:
                        holding.delete()
                    else:
                        holding.total = holding.quantity * holding.price
                        holding.save()
                    return True
                return False
        except Holding.DoesNotExist:
            return False
        except Exception as e:
            return False

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_user_holdings(self, user_id):
        try:
            from accounts.models import Holding
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

    @database_sync_to_async
    def get_user_from_cookie(self):
        try:
            auth = JWTCookieAuthentication()
            raw_headers = self.scope.get('headers', [])
            
            cookie_header_value = None
            for name_bytes, value_bytes in raw_headers:
                if name_bytes.decode('utf-8', errors='ignore').lower() == 'cookie':
                    cookie_header_value = value_bytes.decode('utf-8', errors='ignore')
                    break
            
            if not cookie_header_value:
                return None
            
            cookies = {}
            for cookie_str in cookie_header_value.split(';'):
                if '=' in cookie_str:
                    key, value = cookie_str.strip().split('=', 1)
                    cookies[key.strip()] = value.strip()
            
            jwt_token = cookies.get('jwt_token')
            if not jwt_token:
                return None
            
            validated_token = auth.get_validated_token(jwt_token)
            return auth.get_user(validated_token)
            
        except (InvalidToken, TokenError):
            return None
        except Exception as e:
            return None