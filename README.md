# NEXO · Simulador de servicios de izaje

NEXO es una demo web en español para mostrar la coordinación de servicios de grúa entre clientes y un equipo de operaciones. Incluye solicitudes de ejemplo, seguimiento de estados, planificación de flota y registro de los datos de cierre.

## Qué puedes probar

**Espacio Cliente**

- Crear solicitudes de servicio con modelo de grúa, fecha, horario, ubicación y descripción del trabajo.
- Consultar el estado y el historial de las solicitudes, además de una agenda de servicios.
- Editar los datos de la empresa y enviar consultas, observaciones o reclamos de demostración.

**Espacio Operaciones**

- Revisar solicitudes, actualizar su estado y registrar motivos cuando una no puede atenderse.
- Asignar personal y equipos compatibles, comprobando disponibilidad para la fecha y el horario solicitados.
- Administrar el estado y las fechas de mantención de la flota.
- Registrar horas, consumo, insumos, mantención y traslado al cerrar un servicio; filtrar y exportar esos registros a CSV.

Los dos espacios se seleccionan desde la pantalla inicial. La aplicación trae datos ficticios para que puedas recorrer los flujos sin cargar información primero.

## Requisitos

- Node.js
- npm

## Ejecutar en local

Desde la raíz del repositorio:

```bash
npm ci
npm run dev
```

Abre [http://127.0.0.1:8090](http://127.0.0.1:8090).

Para generar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Datos y alcance de la demo

- Los cambios se guardan en `localStorage` del navegador actual; no se sincronizan entre usuarios, dispositivos o navegadores.
- **Restaurar simulador** devuelve las solicitudes, equipos, mensajes y datos de perfil a sus valores de ejemplo.
- Elegir Cliente u Operaciones solo cambia la interfaz. No hay inicio de sesión ni control de acceso real.
- No hay servidor, base de datos ni conexión con servicios externos. Los nombres, mensajes, solicitudes y registros precargados son ficticios.

Por eso, esta versión sirve para explorar y presentar los flujos de interfaz; todavía no implementa un sistema operativo de reservas ni una gestión multiusuario.

## Tecnologías

- React 18 y TypeScript
- Vite 7
- Lucide React para iconos

## Estructura

- `src/App.tsx`: datos de ejemplo, estado de la demo y pantallas de Cliente y Operaciones.
- `src/styles.css` y `src/responsive-overrides.css`: estilos globales, componentes y ajustes responsive.
- `public/images/`: marca e imágenes referenciales de equipos.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en `127.0.0.1:8090`. |
| `npm run build` | Comprueba TypeScript y genera los archivos en `dist/`. |
| `npm run preview` | Sirve localmente la versión generada en `dist/`. |

El proyecto no tiene un script de pruebas automatizadas configurado.
