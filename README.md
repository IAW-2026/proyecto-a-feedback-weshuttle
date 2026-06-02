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

## 5. Notas y comentarios para la para la correción

* **Microservicios y APIs Externas:** La comunicación con la *Rider App* se encuentra simulada en el endpoint de pre-creación (`/api/reviews/precreate`), permitiendo validar el flujo de generación masiva de reseñas pendientes cuando se inicia un viaje en el ecosistema.
* **Diseño del CRUD:** El CRUD está distribuido lógicamente por roles. El **Administrador** dispone de facultades totales (C/R/U/D) para moderar y gestionar el sistema. El **Pasajero** y el **Conductor** operan bajo un modelo de "Reseña Pendiente": el sistema genera los registros automáticamente al finalizar un viaje (`precreate`), permitiendo al usuario completarlos (U) y consultar su historial (R). No se permite la creación manual sin un viaje previo, la edición posterior al envío, ni el borrado por parte de los usuarios para garantizar la integridad de la reputación corporativa. Cabe destacar que cuando decimos que el sistema genera los registros automáticamente, en esta etapa 2 tenemos desde el lado del conductor dos botones, uno para empezar simulación de viaje el cual precrea las reseñas correspondientes, y el otro de completar viaje y habilitar feedback el cual pasa el estado de esas reseñas PRECREATED a PENDING y así todos los usuarios de ese viaje pueden completarlas.
* **Seguridad y Roles:** Se implementó una lógica de permisos estricta. El rol `ADMIN` es el único con acceso total a la API, mientras que `DRIVER` y `RIDER` solo pueden interactuar con las reseñas donde participan como autores o destinatarios.
* **Server Actions Transaccionales:** La creación y actualización de reseñas se maneja mediante Server Actions que ejecutan transacciones de Prisma, asegurando la consistencia de los datos y la sincronización de perfiles de usuario.
* **Gestión de Identidad:** Se utiliza **Clerk** para la autenticación, con una sincronización automática (upsert) en la base de datos de PostgreSQL (Neon) cada vez que un usuario interactúa con el sistema de feedback.
* **Arquitectura y Stack Tecnológico:** Aplicación construida con **Next.js (App Router)**, **TypeScript** y **Tailwind CSS**. Se utiliza **Prisma ORM** para la gestión de datos sobre una base de datos relacional **PostgreSQL (Neon)**, y **Clerk** para el manejo de autenticación y roles de usuario.

---

## 6. Deseables de mejora
* **Sistema de Reportes:** Si bien está en el modelo del schema.prisma, forma del contrato y el enunciado, por cuestiones de tiempo y aseguraramiento de aplicación web funcional se postergó la implementación del mismo. La idea principal es que sea un sistema en el cual dentro de cada reseña perteneciente al historial nos dé la opción de poder reportarla, elegir el tipo de reporte y agregar un comentario opcional. Esas opciones serán SPAM, CONTENIDO_OFENSIVO, INFORMACION_FALSA, DATOS_PERSONALES, OTROS. Y que tenga estados sean PENDING, BAJO_REVISION, RESUELTO, RECHAZADO. Y en caso de ser resuelto, se elimine esa reseña.