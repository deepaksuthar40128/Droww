from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import transaction
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    UserSerializer, 
    AccountSerializer, 
    AddBalanceSerializer
)
import datetime
from decimal import Decimal

User = get_user_model()

def set_jwt_cookie(response, token, cookie_name='jwt_token'):
    response.set_cookie(
        cookie_name,
        token,
        max_age=settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME', datetime.timedelta(days=7)).total_seconds(),
        httponly=True,
        secure=not settings.DEBUG, 
        samesite='Lax' if settings.DEBUG else 'None' 
    )

def clear_jwt_cookie(response, cookie_name='jwt_token'):
    response.delete_cookie(
        cookie_name,
        samesite='Lax' if settings.DEBUG else 'None'
    )

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        user_data = UserSerializer(user).data
        
        response = Response({
            'user': user_data,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)
        
        set_jwt_cookie(response, access_token)
        
        return response
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        user_data = UserSerializer(user).data
        
        response = Response({
            'user': user_data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
        
        set_jwt_cookie(response, access_token)
        
        return response
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    response = Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)
    
    clear_jwt_cookie(response)
    
    return response

@api_view(['GET'])
def check_session(request):
    if request.user.is_authenticated:
        user_data = UserSerializer(request.user).data
        return Response({
            'isValid': True,
            'user': user_data
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'isValid': False
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    user_data = UserSerializer(request.user).data
    return Response({
        'user': user_data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_balance(request):
    serializer = AddBalanceSerializer(data=request.data)
    if serializer.is_valid():
        amount = serializer.validated_data['amount']
        
        with transaction.atomic():
            user = request.user
            user.balance += amount
            user.save()
        
        return Response({
            'message': 'Balance added successfully',
            'new_balance': user.balance
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_account_details(request):
    user = request.user
    account_data = AccountSerializer(user).data
    
    return Response(account_data, status=status.HTTP_200_OK)