import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from fake_data_gen.fake_data_manager import fake_data_manager
from accounts.authentication import JWTCookieAuthentication
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()
logger = logging.getLogger(__name__)

class FakeDataConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            user = await self.get_user_from_cookie()

            if user is None or not user.is_authenticated:
                await self.close(code=4001)
                return

            self.scope['user'] = user
            await self.accept()
            
            await fake_data_manager.send_initial_data(self.channel_name)
            fake_data_manager.connected_consumers.add(self.channel_name)

            if not fake_data_manager.is_running:
                await fake_data_manager.start()

            await self.send(text_data=json.dumps({
                'type': 'connection',
                'data': {
                    'status': 'connected',
                    'message': 'Successfully connected to RELIANCE market data feed',
                    'symbol': 'RELIANCE'
                }
            }))

        except Exception as e:
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'channel_name'):
                fake_data_manager.connected_consumers.discard(self.channel_name)

            if not fake_data_manager.connected_consumers:
                await fake_data_manager.stop()

        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")

    async def initial_data(self, event):
        try:
            await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending initial data: {e}")

    async def market_data(self, event):
        try:
            await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending market data: {e}")

    async def orderbook_data(self, event):
        try:
            await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending orderbook data: {e}")

    async def trade_data(self, event):
        try:
            await self.send(text_data=event["message"])
        except Exception as e:
            logger.error(f"Error sending trade data: {e}")

    @database_sync_to_async
    def get_user_from_cookie(self):
        try:
            auth = JWTCookieAuthentication()
            
            headers = dict(self.scope.get('headers', []))
            cookie_header = None
            
            for key, value in headers.items():
                if key.decode('utf-8').lower() == 'cookie':
                    cookie_header = value.decode('utf-8')
                    break
            
            if not cookie_header:
                return None
            
            cookies = {}
            for cookie in cookie_header.split(';'):
                if '=' in cookie:
                    key, value = cookie.strip().split('=', 1)
                    cookies[key.strip()] = value.strip()
            
            jwt_token = cookies.get('jwt_token')
            if not jwt_token:
                return None
            
            validated_token = auth.get_validated_token(jwt_token)
            user = auth.get_user(validated_token)
            
            return user
            
        except (InvalidToken, TokenError) as e:
            return None
        except Exception as e:
            return None