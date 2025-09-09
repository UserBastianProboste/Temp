from rest_framework import serializers
from .models import CustomUser,Empresa,FichaPractica
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id','email','first_name','last_name','rol','carrera','telefono','direccion','rut']
        read_only_fields = ['id']
        
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['email','password','first_name','last_name','carrera','telefono','direccion','rut']
    
    def validate_email(self,value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('el email ya esta registrado')
        return value
    
    def validate_password(self,value):
        if len(value) < 8:
            raise serializers.ValidationError('La contrasenia debe tener al menos 8 caracteres.')
        return value
    def create(self, validated_data):
        email = validated_data.get('email')
        username= email.split('@')[0]
        base_username = username
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter +=1
            
        user = CustomUser.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            rol='estudiante',
            carrera=validated_data.get('carrera', ''),
            telefono=validated_data.get('telefono', ''),
            direccion=validated_data.get('direccion', ''),
            rut=validated_data.get('rut','')
        )
        return user

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'
        
class FichaPracticaSerializer(serializers.ModelSerializer):
    estudiante = serializers.PrimaryKeyRelatedField(read_only=True)
    empresa = serializers.PrimaryKeyRelatedField(queryset=Empresa.objects.all())
    
    class Meta:
        model = FichaPractica
        fields = '__all__'

class EmailTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({"detail": "Usuario no encontrado"})
            
        user = authenticate(username=user.username, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Credenciales incorrectas"})
        
        # Tu vista espera estos campos específicos
        attrs['user'] = user
        attrs['tipo_usuario'] = user.rol
        
        return attrs