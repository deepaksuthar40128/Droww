from django.apps import AppConfig
import asyncio

class WsPlatformConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fake_data_gen'

    def ready(self):
        pass