# WeShuttle - Feedback App

## 1. Link al deploy de producción
**🔗 https://proyecto-a-feedback-weshuttle.vercel.app**

---

## 2. Listado de usuarios disponibles

| Perfil | Email | Contraseña | Vistas Accesibles |
| :--- | :--- | :--- | :--- |
| **Administrador** | admin+clerk_test@iaw.com | iawuser# | Panel de Moderación, Gestión de Reseñas, Dashboard Admin |
| **Conductor** | driver+clerk_test@iaw.com | iawuser# | Dashboard Conductor, Mis Estadísticas, Feedback de Pasajeros |
| **Pasajero** | rider+clerk_test@iaw.com | iawuser# | Dashboard Pasajero, Mis Viajes, Calificar Conductor |

---

## 3. Instrucciones para utilizar la aplicación

1. Ingrese al enlace de producción en Vercel.
2. Haga clic en el botón **"Ingresar"** en la barra superior.
3. Inicie sesión (autenticación vía Clerk) utilizando alguna de las credenciales provistas en la tabla anterior.
4. Dependiendo de la cuenta con la que ingrese, la experiencia y los permisos serán distintos:
   * **Como Pasajero:** Podrá visualizar el historial de viajes realizados (Pools), completar las reseñas pendientes para los conductores y ver el feedback recibido.
   * **Como Conductor:** Tendrá acceso a su promedio de calificación (Rating), estadísticas de desempeño y podrá calificar a cada pasajero que formó parte de sus viajes.
   * **Como Administrador:** Tendrá acceso exclusivo a un panel de control para moderar reseñas, gestionar la visibilidad de los comentarios y ver métricas globales de satisfacción del servicio.

---

## 4. Breve descripción del proyecto

Aplicación orientada a la gestión de reputación y calidad para la plataforma WeShuttle. El sistema permite el intercambio de feedback mutuo entre conductores y pasajeros para optimizar la seguridad y convivencia en los traslados corporativos.
Permite por otra parte, consultar las reseñas históricas tanto del pasajero como del
conductor dentro del mismo usuario.


En este ecosistema, la **Feedback App** centraliza el registro de calificaciones y reseñas. Se integra con la Rider App y la Driver App para identificar los participantes de cada Pool y garantizar que el proceso de calificación sea íntegro y veraz una vez finalizado el trayecto.

---

## 5. Notas y comentarios para la corrección

* **Integraciones Reales con Microservicios y APIs Externas:** La comunicación con las aplicaciones *Rider App* y *Driver App* es completamente real y dinámica. Se implementó:
  * Sincronización en tiempo real del perfil y nombre de pasajeros y conductores consultando los endpoints correspondientes de cada aplicación.
  * Polling automático de estado en segundo plano ([AutoReviewActivator](file:///Users/juansebastianbassi/Desktop/proyecto-a-feedback-weshuttle/feedback-app/app/components/AutoReviewActivator.tsx)) para detectar cuándo un Pool pasa a estado `COMPLETED` en la Driver App, procediendo a activar automáticamente las reseñas de `PRECREATED` a `PENDING`.
  * Notificación automática a la Rider App y Driver App (a través de `/api/notifications/feedback`) tras la activación de reseñas.
  * La opción de mocks (`USE_MOCK_PASSENGERS`) existe para entornos aislados, pero por defecto se encuentra desactivada para priorizar la integración real.
* **Sistema de Reportes Completado:** Se implementó en su totalidad el sistema de moderación de reseñas:
  * Desde el historial, los usuarios pueden reportar cualquier reseña indicando la categoría del reporte (`SPAM`, `CONTENIDO_OFENSIVO`, `INFORMACION_FALSA`, `DATOS_PERSONALES`, `OTROS`) y un comentario opcional.
  * Los reportes ingresan en estado `PENDING`.
  * El **Administrador** posee un panel exclusivo de reportes (`/dashboard/admin/reports`) donde puede listar, revisar y marcar los reportes como `RESUELTO` o `RECHAZADO`.
  * Al marcar un reporte como `RESUELTO`, la reseña asociada cambia automáticamente a estado `REMOVED` (borrado lógico), ocultándola del historial de los usuarios para preservar la moderación y la integridad de los datos.
* **Diseño del CRUD:** El CRUD está distribuido lógicamente por roles. El **Administrador** dispone de facultades totales (C/R/U/D) para moderar y gestionar el sistema. El **Pasajero** y el **Conductor** operan bajo un modelo de "Reseña Pendiente": el sistema genera los registros automáticamente al finalizar un viaje, permitiendo al usuario completarlos (U) y consultar su historial (R). No se permite la creación manual sin un viaje previo, la edición posterior al envío, ni el borrado por parte de los usuarios para garantizar la integridad de la reputación corporativa.
* **Ajustes de UI y Mismatch de Hidratación:** La interfaz fue mejorada con un diseño premium y responsive, unificando las páginas de `/sign-in` y `/sign-up` con el estilo de logo SVG e identidad visual del resto del ecosistema de WeShuttle. Asimismo, se corrigieron los errores de hidratación de React (#418) forzando una zona horaria estricta (`America/Argentina/Buenos_Aires`) en todos los formateadores de fechas cliente/servidor.
* **Seguridad y Roles:** Se implementó una lógica de permisos estricta. El rol `ADMIN` es el único con acceso total a la API, mientras que `DRIVER` y `RIDER` solo pueden interactuar con las reseñas donde participan como autores o destinatarios.
* **Server Actions Transaccionales:** La creación y actualización de reseñas se maneja mediante Server Actions que ejecutan transacciones de Prisma, asegurando la consistencia de los datos y la sincronización de perfiles de usuario.
* **Gestión de Identidad:** Se utiliza **Clerk** para la autenticación, con una sincronización automática (upsert) en la base de datos de PostgreSQL (Neon) cada vez que un usuario interactúa con el sistema de feedback.
* **Arquitectura y Stack Tecnológico:** Aplicación construida con **Next.js (App Router)**, **TypeScript** y **Tailwind CSS**. Se utiliza **Prisma ORM** para la gestión de datos sobre una base de datos relacional **PostgreSQL (Neon)**, y **Clerk** para el manejo de autenticación y roles de usuario.
 
---
 
## 6. Mejoras Implementadas (A comparación de la Etapa 2)
 
### 1. Sistema de Reportes y Moderación Completo
* **Categorías de Reportes (Enumerados):** `SPAM`, `CONTENIDO_OFENSIVO`, `INFORMACION_FALSA`, `DATOS_PERSONALES`, y `OTROS`.
* **Efectos de la Moderación:**
  * **Aceptado (ADMIN):** Si el Administrador aprueba el reporte (marcando el estado como `RESUELTO`), la reseña ofensiva se marca lógicamente como `REMOVED`, ocultándose de forma inmediata y definitiva del historial de los usuarios para preservar la moderación y la integridad de la reputación corporativa.
  * **Rechazado (ADMIN):** Si el Administrador rechaza el reporte, la reseña permanece visible con su flujo normal y el reporte pasa a estado `RECHAZADO`. Sin embargo, para evitar abusos o spam de reportes, **esta reseña específica queda bloqueada y no se puede volver a reportar**.
 
### 2. Búsqueda y Paginación URL con Resaltado de Texto
* **Paginación y Filtro URL:** El estado de los inputs de búsqueda y el número de página actual se persisten en la URL (`?search=...&page=...`), garantizando que al refrescar la página o compartir el enlace se mantenga la vista exacta del usuario.
* **Resaltado de Caracteres:** Los caracteres o palabras coincidentes se envuelven dinámicamente con una etiqueta `<mark>` aplicando estilos corporativos para localizar fácilmente las coincidencias visuales.
* **Criterios de Búsqueda:**
  * **En el Panel del Administrador (Admin):** Permite buscar reseñas y reportes filtrando por el **ID del Pool (Viaje)**, nombres o IDs de los autores, destinatarios o reporteros.
  * **En el Panel del Pasajero (Rider):** Permite filtrar y buscar dentro de su historial de viajes y reseñas ingresando el **nombre del conductor (Driver)**.
  * **En el Panel del Conductor (Driver):** Permite filtrar y buscar dentro de su historial ingresando el **nombre del pasajero (Rider)**.
 
### 3. Detalles Estéticos e Integración Visual
* **Notificaciones Toast:** Incorporación de avisos emergentes interactivos (Toast) para notificar de forma fluida el éxito o error en el envío de reseñas y moderación de reportes.
* **Footer Corporativo:** Se agregó un pie de página unificado que complementa la experiencia visual de WeShuttle.
* **Estandarización de Estilos:** Se alinearon los componentes, paleta de colores HSL, botones y contenedores visuales con las aplicaciones de los otros integrantes del equipo, logrando una identidad corporativa unificada y fluida a lo largo de todo el ecosistema WeShuttle.
 
### 4. Visualización de Reseñas Enviadas
* **Historial Completo:** Tanto conductores como pasajeros pueden consultar de forma organizada todas las reseñas que han enviado (emitido) a otros usuarios del sistema, permitiendo un seguimiento transparente de las evaluaciones otorgadas.
 
### 5. Exportación de Reportes y Reseñas a Excel (.xlsx)
* **Resolución del Problema:** Habilita la descarga local de listados críticos de datos (reportes y reseñas) directamente al dispositivo del usuario. Resuelve la necesidad de contar con un soporte offline para análisis de datos externo, auditorías rápidas y visualización clara fuera de la plataforma.
* **Características:**
  * **Carga Eficiente:** La librería `exceljs` se importa de manera dinámica en el cliente únicamente al presionar el botón de exportación, evitando sobrecargar el bundle inicial del sitio.
  * **Diseño Estilizado Premium:** Reportes con cabeceras corporativas azul oscuro, cuadrículas definidas, alternancia de filas (zebra striping), escalado condicional de colores para calificaciones y estados, y ajuste automático del tamaño de celda según el contenido.
  * **Interfaz Contextual:** Botones con iconos y descripciones que cambian de forma dinámica adaptándose al contexto de la pestaña activa (ej. *Todos*, *Pasajeros*, *Conductores*, *Enviadas* o *Recibidas*).
 
---
 
## 7. Limitaciones de la Aplicación
 
* **Sincronización de Sesiones Clerk en un mismo navegador:**
  Aunque las aplicaciones del ecosistema están completamente integradas a nivel de backend y transmiten datos en tiempo real, existe una limitación del lado del cliente al usar Clerk en un mismo navegador. 
  Si el usuario inicia sesión en la *Rider App* con una cuenta y en la *Feedback App* con otra distinta (o viceversa), las cookies de sesión compartidas de Clerk en localhost o subdominios pueden colisionar, impidiendo captar el rol y usuario Clerk correcto al realizar redirecciones directas. Para pruebas multi-rol en un entorno local, se recomienda utilizar perfiles de navegador independientes o ventanas en modo incógnito.
