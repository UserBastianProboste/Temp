# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
## Notificaciones y función de envío de correo

Este repo incluye un ejemplo para enviar notificaciones al coordinador cuando un estudiante envía el formulario de práctica.

- SQL para crear la tabla `notificaciones`: `sql/create_notificaciones.sql`
- Ejemplo de Supabase Edge Function: `supabase_functions/send_coordinator_notification/index.ts`
- Instrucciones de despliegue en: `supabase_functions/send_coordinator_notification/README.md`

Sigue las instrucciones del README de la función para desplegarla y configurar las variables de entorno (por ejemplo, `SENDGRID_API_KEY` y `FROM_EMAIL`).

## Depuración: forzar la pantalla de carga

Si quieres ver la animación de `LoadingScreen` sin depender de retrasos reales en Supabase, puedes pedirle al proveedor de autenticación que simule una espera estableciendo la variable de entorno `VITE_DEBUG_AUTH_DELAY_MS` (valor en milisegundos). Por ejemplo:

```bash
VITE_DEBUG_AUTH_DELAY_MS=4000 npm run dev
```

También puedes añadir la variable al archivo `.env` de Vite mientras desarrollas. Con cualquier valor mayor que `0`, la app mantendrá el estado de carga durante el tiempo indicado, lo que te permite validar la pantalla de carga en todas las rutas protegidas.
