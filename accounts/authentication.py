from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from django.contrib.auth import get_user_model
from rest_framework import exceptions

User = get_user_model()

class JWTCookieAuthentication(JWTAuthentication):
    
    def authenticate(self, request):
        raw_token = request.COOKIES.get('jwt_token')
        
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        return (user, validated_token)
    
    def get_validated_token(self, raw_token):
        messages = []
        for AuthToken in self.get_token_types():
            try:
                return AuthToken(raw_token)
            except TokenError as e:
                messages.append({
                    'token_class': AuthToken.__name__,
                    'token_type': AuthToken.token_type,
                    'message': e.args[0],
                })

        raise InvalidToken({
            'detail': 'Given token not valid for any token type',
            'messages': messages,
        })
    
    def get_user(self, validated_token):
        try:
            user_id = validated_token[self.get_token_user_id_claim()]
        except KeyError:
            raise InvalidToken('Token contained no recognizable user identification')

        try:
            user = User.objects.get(**{self.get_token_user_id_field(): user_id})
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found', code='user_not_found')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User is inactive', code='user_inactive')

        return user
    
    def get_token_user_id_claim(self):
        return getattr(self.get_token_types()[0], 'user_id_claim', 'user_id')
    
    def get_token_user_id_field(self):
        return getattr(self.get_token_types()[0], 'user_id_field', 'id')
    
    def get_token_types(self):
        from rest_framework_simplejwt.tokens import AccessToken
        return [AccessToken]