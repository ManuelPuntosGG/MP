import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

logger = logging.getLogger(__name__)


class EmailBackend(ModelBackend):
    """Backend de autenticación que usa email en lugar de username."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        email = kwargs.get('email', username)

        if email is None:
            return None

        # Normalizar email a minúsculas
        email = email.strip().lower()

        try:
            user = UserModel.objects.get(email=email)
        except UserModel.DoesNotExist:
            logger.debug("Intento de login con email inexistente: %s", email)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            logger.info("Login exitoso: %s", email)
            return user

        logger.warning("Contraseña incorrecta para: %s", email)
        return None

