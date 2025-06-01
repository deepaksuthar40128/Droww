from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'trading/$', consumers.TradingConsumer.as_asgi()),
]