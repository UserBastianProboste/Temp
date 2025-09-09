from django.urls import path
from .views import (
    CustomUserListView,
    EmpresaListCreateView,
    EmailTokenObtainPairView,
    RegisterView,
    FichaPracticaListCreateView
)


urlpatterns = [
 path('estudiantes/',CustomUserListView.as_view(),name='estudiantes-list'),
 path('empresas/',EmpresaListCreateView.as_view(),name='empresas-list'),
 path('login/',EmailTokenObtainPairView.as_view(),name='token_obtain_pair'),
 path('register/',RegisterView.as_view(),name='register'),
 path('fichas-practicas/',FichaPracticaListCreateView.as_view(),name='fichas-practicas-list'),
]