from django.urls import re_path
from channels.routing import URLRouter
from fake_data_gen.consumers import FakeDataConsumer
from trading.consumers import TradingConsumer

websocket_urlpatterns = [
    re_path(r'^ws/fake/?$', FakeDataConsumer.as_asgi()),
    re_path(r'^ws/trading/?$', TradingConsumer.as_asgi()),
]