"""Pruebas unitarias para los componentes del backend.

Este módulo reúne verificaciones formales destinadas a evaluar el
comportamiento de los modelos y serializadores principales del sistema.
Las pruebas se redactan conforme a las directrices de estilo de PEP 8 y
se acompañan de comentarios declarativos de carácter académico.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from internships.models import Empresa, FichaPractica
from internships.serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
)


class ModelStringRepresentationTests(TestCase):
    """Evalúa la representación textual de las entidades de dominio."""

    def setUp(self):
        """Configura datos básicos para las pruebas de modelos."""
        self.user = get_user_model().objects.create_user(
            username="alumno",
            email="alumno@example.com",
            password="contrasena_segura",
            rol="estudiante",
        )
        self.company = Empresa.objects.create(razon_social="ACME")

    def test_custom_user_str(self):
        """El método __str__ debe concatenar nombre de usuario y rol."""
        self.assertEqual(str(self.user), "alumno - estudiante")

    def test_empresa_str_with_name(self):
        """__str__ debe retornar la razón social cuando esta existe."""
        self.assertEqual(str(self.company), "ACME")

    def test_empresa_str_without_name(self):
        """Sin razón social, __str__ debe informar la ausencia de nombre."""
        unnamed = Empresa.objects.create()
        self.assertEqual(str(unnamed), "Empresa sin nombre")

    def test_fichapractica_str(self):
        """__str__ debe reflejar estudiante, empresa y estado de la práctica."""
        ficha = FichaPractica.objects.create(
            estudiante=self.user,
            empresa=self.company,
            fecha_inicio=date.today(),
            fecha_termino=date.today(),
        )
        esperado = (
            f"{self.user.username} - {self.company.razon_social} ({ficha.estado})"
        )
        self.assertEqual(str(ficha), esperado)


class RegisterSerializerTests(TestCase):
    """Examina la lógica del proceso de registro de usuarios."""

    def test_rejects_short_passwords(self):
        """Contraseñas menores a ocho caracteres deben ser rechazadas."""
        datos = {"email": "nuevo@example.com", "password": "corta"}
        serializador = RegisterSerializer(data=datos)
        self.assertFalse(serializador.is_valid())
        self.assertIn("password", serializador.errors)

    def test_rejects_duplicate_email(self):
        """El registro debe impedir reutilizar un correo existente."""
        user_model = get_user_model()
        user_model.objects.create_user(
            username="existente",
            email="duplicado@example.com",
            password="segura123",
        )
        datos = {"email": "duplicado@example.com", "password": "nueva123"}
        serializador = RegisterSerializer(data=datos)
        self.assertFalse(serializador.is_valid())
        self.assertIn("email", serializador.errors)

    def test_generates_unique_username(self):
        """El nombre de usuario derivado del correo debe ser único."""
        user_model = get_user_model()
        user_model.objects.create_user(
            username="repetido",
            email="repetido@example.com",
            password="clave12345",
        )
        datos = {"email": "repetido@otra.com", "password": "clave12345"}
        serializador = RegisterSerializer(data=datos)
        self.assertTrue(serializador.is_valid(), serializador.errors)
        usuario = serializador.save()
        self.assertEqual(usuario.username, "repetido1")


class EmailTokenObtainPairSerializerTests(TestCase):
    """Valida la autenticación basada en correo electrónico."""

    def setUp(self):
        """Crea un usuario de referencia para las pruebas."""
        self.user = get_user_model().objects.create_user(
            username="usuario",
            email="usuario@example.com",
            password="segura123",
            rol="estudiante",
        )

    def test_invalid_email_raises_error(self):
        """Un correo inexistente debe provocar un error de validación."""
        datos = {"email": "desconocido@example.com", "password": "segura123"}
        serializador = EmailTokenObtainPairSerializer(data=datos)
        with self.assertRaises(ValidationError):
            serializador.is_valid(raise_exception=True)

    def test_invalid_password_raises_error(self):
        """Una contraseña incorrecta debe impedir la autenticación."""
        datos = {"email": self.user.email, "password": "incorrecta"}
        serializador = EmailTokenObtainPairSerializer(data=datos)
        with self.assertRaises(ValidationError):
            serializador.is_valid(raise_exception=True)

    def test_valid_credentials_return_user(self):
        """Credenciales válidas deben devolver al usuario autenticado."""
        datos = {"email": self.user.email, "password": "segura123"}
        serializador = EmailTokenObtainPairSerializer(data=datos)
        self.assertTrue(serializador.is_valid(), serializador.errors)
        self.assertEqual(serializador.validated_data["user"], self.user)
        self.assertEqual(
            serializador.validated_data["tipo_usuario"], "estudiante"
        )
