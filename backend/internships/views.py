from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import CustomUser, Empresa, FichaPractica
from django.core.mail import send_mail
from django.conf import settings
from .serializers import (
    CustomUserSerializer, 
    RegisterSerializer, 
    EmpresaSerializer, 
    EmailTokenObtainPairSerializer,
    FichaPracticaSerializer
)

class CustomUserListView(generics.ListAPIView):
    queryset = CustomUser.objects.filter(rol='estudiante')
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    
class EmpresaListCreateView(generics.ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
class EmailTokenObtainPairView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = EmailTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tipo_usuario = serializer.validated_data['tipo_usuario']
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "tipo_usuario": tipo_usuario,
            "username": user.username,
            "email": user.email
        })
        
class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                CustomUserSerializer(user).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FichaPracticaListCreateView(generics.ListCreateAPIView):
    queryset = FichaPractica.objects.all()
    serializer_class = FichaPracticaSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(estudiante=self.request.user)
        
    def get_queryset(self):
        user = self.request.user
        if user.rol == 'coordinador':
            return FichaPractica.objects.all()
            return FichaPractica.objects.filter(estudiante=user)

    class AlertView(APIView):
        permission_classes = [IsAuthenticated]

        def post(self, request):
            email = request.data.get('email') or request.user.email
            message = request.data.get('message', 'Aviso Alarma')
            send_mail(
                subject='Alarma',
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'status': 'sent'})
