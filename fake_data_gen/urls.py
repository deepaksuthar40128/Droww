from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'fake/$', consumers.FakeDataConsumer.as_asgi()),
]