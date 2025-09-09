from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLES = (
        ('estudiante','Estudiante'),
        ('coordinador','Coordinador'),
    )
    rol = models.CharField(max_length=20,choices=ROLES)
    carrera = models.CharField(max_length=50,blank=True,null=True)
    telefono = models.CharField(max_length=50,blank=True,null=True)
    direccion = models.CharField(max_length=200,blank=True,null=True)
    rut = models.CharField(max_length=50,blank=True,null=True)
    def __str__(self):
        return f"{self.username} - {self.rol}"

class Empresa(models.Model):
    razon_social = models.CharField(max_length=100,blank=True,null=True)
    direccion = models.CharField(max_length=50,blank=True,null=True)
    jefe_directo= models.CharField(max_length=50,blank=True,null=True)
    cargo = models.CharField(max_length=50,blank=True,null=True)
    telefono = models.CharField(max_length=50,blank=True,null=True)
    email = models.EmailField(max_length=120,blank=True,null=True)
    def __str__(self):
        return self.razon_social or "Empresa sin nombre"
    
class FichaPractica(models.Model):
    TIPO_PRACTICA = (
        ('practica_1','Practica I'),
        ('practica_2','Practica iI')
    )
    ESTADOS = (
        ('pendiente' , 'Pendiente'),
        ('aprobada' , 'Aprobada'),
        ('rechazada' , 'Rechazada'),
        ('Completada' , 'Completada'),
    )
    estudiante = models.ForeignKey(CustomUser,on_delete=models.CASCADE,limit_choices_to={'rol':'estudiante'})
    empresa = models.ForeignKey(Empresa,on_delete=models.CASCADE)
    
    tipo_practica = models.CharField(max_length=20,choices=TIPO_PRACTICA,default='practica_1')
    
    fecha_inicio = models.DateField()
    fecha_termino = models.DateField()
    
    horario_trabajo = models.CharField(max_length=100, blank=True, null=True)
    horario_colacion = models.CharField(max_length=100, blank=True, null=True)
    cargo_desarrollar = models.CharField(max_length=100, blank=True, null=True)
    departamento = models.CharField(max_length=100, blank=True, null=True)
    actividades = models.TextField(blank=True, null=True)
    
    fecha_postulacion = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    comentarios = models.TextField(blank=True, null=True)
    def __str__(self):
        return f"{self.estudiante.username} - {self.empresa.razon_social} ({self.estado})"
