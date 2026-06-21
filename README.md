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
