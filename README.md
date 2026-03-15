# Gastos Andrea - PWA

App de control de gastos personales como Progressive Web App.

## Subir a Vercel (3 pasos)

### 1. Subir a GitHub
- Anda a https://github.com/new y crea un repositorio (ej: "gastos-app")
- En tu Mac, abrí Terminal y ejecuta:

```bash
cd ~/Downloads/gastos-pwa
git init
git add .
git commit -m "primera version"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gastos-app.git
git push -u origin main
```

### 2. Deploy en Vercel
- Anda a https://vercel.com y logueate con tu cuenta de GitHub
- Click en "Add New Project"
- Selecciona tu repositorio "gastos-app"
- Click en "Deploy" (no toques nada mas)
- En 1-2 minutos tenes tu URL (ej: gastos-app.vercel.app)

### 3. Agregar a tu iPhone
- Abrí Safari en tu iPhone
- Entrá a tu URL de Vercel (ej: gastos-app.vercel.app)
- Toca el botón de compartir (cuadradito con flecha)
- Selecciona "Agregar a pantalla de inicio"
- Ponele nombre "Gastos"
- Listo! Se abre como app, sin barra de Safari

## Actualizar el diseño
Cuando quieras cambiar algo:
1. Edita el archivo `src/GastosApp.js`
2. En Terminal:
```bash
cd ~/Downloads/gastos-pwa
git add .
git commit -m "cambios"
git push
```
3. Vercel se actualiza automaticamente en ~30 segundos
4. La proxima vez que abras la app en tu iPhone, se actualiza sola
5. Tus datos NO se pierden al actualizar

## Notas
- Los datos se guardan en el almacenamiento local de Safari
- Funciona offline despues de la primera carga
- NO borres los datos de Safari o se pierden los gastos
