from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/check-session/', views.check_session, name='check_session'),
    path('auth/logout/', views.logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('account/add-balance/', views.add_balance, name='add_balance'),
    path('account/details/', views.get_account_details, name='account_details'),
]