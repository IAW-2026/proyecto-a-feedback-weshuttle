# 1.5 — Usuarios Compartidos

> **Tipo A — Plataforma de Transporte (WeShuttle)**

El sistema utiliza **Clerk** como servicio centralizado de autenticación.

Los usuarios se autentican a través de Clerk independientemente de qué aplicación estén usando, y la identidad se propaga entre servicios mediante el token JWT emitido por Clerk.

Cada webapp mantiene sus propios datos de dominio en su base de datos, pero utiliza el identificador de Clerk como referencia común para reconocer al mismo usuario entre aplicaciones.

El identificador compartido entre todas las apps es:

```text
clerk_user_id
```

Este identificador corresponde al claim estándar:

```text
sub
```

---

## ¿Qué apps comparten usuarios?

| Usuario | Apps donde puede autenticarse | Descripción |
|---------|------------------------------|-------------|
| **Empleado / Pasajero (`rider`)** | Rider App, Payments App, Feedback App | Puede solicitar viajes, reservar lugares en pools, pagar reservas desde Payments App, utilizar saldo a favor disponible, consultar pagos asociados a sus viajes y calificar al conductor al finalizar el viaje. |
| **Conductor (`driver`)** | Driver App, Payments App, Feedback App | Puede aceptar pools desde el marketplace, gestionar el recorrido, configurar o consultar su cuenta de cobro, recibir liquidaciones y calificar pasajeros. |
| **Administrador (`admin`)** | Rider App, Driver App, Payments App, Feedback App y posteriormente Control Plane | Puede gestionar datos principales, consultar listados, revisar reportes y administrar operaciones del sistema. |

---

## Roles del sistema

Los roles principales del sistema son:

```text
rider
driver
admin
```

### `rider`

Representa a un empleado industrial que utiliza la plataforma como pasajero.

Permisos principales:

- acceder a Rider App;
- solicitar viajes;
- crear reservas;
- pagar reservas desde Payments App;
- utilizar saldo a favor disponible en próximos viajes;
- consultar pagos asociados a sus viajes;
- consultar su saldo a favor disponible;
- visualizar estado del viaje;
- recibir notificaciones cuando se genere saldo a favor;
- completar reseñas desde Feedback App;
- visualizar su promedio de calificaciones y reportes recibidos según corresponda.
---

### `driver`

Representa a un conductor habilitado para realizar viajes.

Permisos principales:

- acceder a Driver App;
- visualizar pools disponibles en el marketplace;
- aceptar viajes;
- actualizar el estado operativo del viaje;
- consultar información de liquidaciones desde Payments App;
- configurar o consultar su cuenta de cobro desde Payments App, si corresponde;
- recibir liquidaciones;
- completar reseñas a pasajeros desde Feedback App;
- visualizar su promedio de calificaciones y reportes recibidos según corresponda.

---

### `admin`

Representa a un usuario con permisos administrativos.

Permisos principales:

- acceder a las aplicaciones para tareas de gestión;
- gestionar datos maestros;
- consultar listados y reportes;
- revisar reportes de moderación;
- administrar conductores, pasajeros, destinos y otros datos operativos según corresponda.

---

## Claims del JWT relevantes

Los siguientes claims deben estar disponibles en el JWT utilizado por las aplicaciones.

| Claim | Tipo | Descripción |
|------|------|-------------|
| `sub` | string | Identificador único del usuario en Clerk. Se utiliza como `clerk_user_id` en las bases de datos locales. |
| `role` | string | Rol principal del usuario dentro del sistema. Valores posibles: `rider`, `driver`, `admin`. |
| `company_code` | string, nullable | Código de empresa o pertenencia industrial del usuario. Aplica principalmente a usuarios con rol `rider`. |
| `email` | string | Email del usuario. Puede utilizarse para mostrar información básica o tareas administrativas. |
| `name` | string | Nombre del usuario. Puede utilizarse para mostrar información básica en la interfaz. |

---

## Claims utilizados por cada app

| App | Claims utilizados | Para qué se utilizan |
|-----|------------------|----------------------|
| **Rider App** | `sub`, `role`, `company_code` | Identificar al pasajero, verificar que tenga rol `rider` o `admin`, validar pertenencia a una empresa industrial y asociar reservas al usuario. |
| **Driver App** | `sub`, `role` | Identificar al conductor, verificar que tenga rol `driver` o `admin`, y asociar pools o acciones operativas al conductor autenticado. |
| **Payments App** | `sub`, `role` | Identificar al usuario que paga una reserva, consulta saldo a favor, utiliza crédito disponible, consulta pagos o recibe liquidaciones. El rol permite distinguir si el usuario opera como pasajero, conductor o administrador. |
| **Feedback App** | `sub`, `role` | Identificar al autor de una reseña o reporte y validar si está actuando como pasajero, conductor o administrador. |
| **Control Plane** *(futuro)* | `sub`, `role` | Permitir acceso únicamente a usuarios con rol `admin`. |

---

## Configuración de Clerk

Los roles y datos compartidos se gestionan mediante metadata de Clerk.

Se propone utilizar `publicMetadata` para almacenar los datos que deben ser accesibles por las aplicaciones frontend y backend:

```json
{
  "role": "rider",
  "company_code": "empresa_001"
}
```

Ejemplo para un conductor:

```json
{
  "role": "driver"
}
```

Ejemplo para un administrador:

```json
{
  "role": "admin"
}
```

---

## Configuración del JWT Template / Session Claims

El campo `company_code` es un claim custom necesario para validar la pertenencia industrial de los empleados que utilizan la Rider App.

Este claim debe configurarse explícitamente en el JWT Template o en la configuración de Session Claims de Clerk.

No alcanza con guardar `company_code` en `publicMetadata`; debe incluirse explícitamente como claim del token para que esté disponible en las aplicaciones mediante el JWT.

Claims custom esperados en el token:

```json
{
  "role": "{{user.public_metadata.role}}",
  "company_code": "{{user.public_metadata.company_code}}"
}
```

Notas:

- `sub` es el identificador estándar del usuario en Clerk.
- `role` debe estar disponible para que cada app pueda proteger rutas y validar permisos.
- `company_code` debe estar disponible especialmente para Rider App.
- No se debe incluir todo `publicMetadata` dentro del JWT. Solo deben agregarse los campos necesarios, para evitar tokens innecesariamente grandes.

---

## Estrategia de asignación de roles

### Registro de empleados / pasajeros

Cuando un empleado se registra, debe ingresar un código corporativo o industrial válido.

Si el código es válido:

1. Se crea el usuario en Clerk.
2. Se asigna `role = "rider"`.
3. Se guarda el `company_code` correspondiente.
4. La Rider App puede crear o completar el perfil local del pasajero utilizando el `sub` del JWT como `clerk_user_id`.

---

### Registro de conductores

El conductor debe atravesar un proceso de validación antes de poder operar como driver.

Proceso esperado:

1. Se crea el usuario en Clerk.
2. Inicialmente puede quedar pendiente de validación.
3. Un administrador verifica la documentación del conductor.
4. Cuando el conductor queda aprobado, se asigna `role = "driver"`.
5. La Driver App crea o actualiza el perfil local del conductor usando `sub` como `clerk_user_id`.

La información operativa del conductor, como estado de verificación, vehículos y disponibilidad, no se guarda como claim del JWT. Esa información pertenece a la base de datos de la Driver App.

---

### Registro de administradores

Los administradores son asignados manualmente por el equipo responsable del sistema.

Proceso esperado:

1. Se crea el usuario en Clerk.
2. Se asigna `role = "admin"` desde la configuración administrativa.
3. El usuario puede acceder a las aplicaciones necesarias para tareas de gestión.

---

## Validación de acceso por app

Cada app debe validar el JWT en sus rutas protegidas.

| App | Roles permitidos |
|-----|------------------|
| **Rider App** | `rider`, `admin` |
| **Driver App** | `driver`, `admin` |
| **Payments App** | `rider`, `driver`, `admin` |
| **Feedback App** | `rider`, `driver`, `admin` |
| **Control Plane** *(futuro)* | `admin` |

---

## Uso de Payments App por rol

La Payments App puede ser utilizada por distintos tipos de usuario, pero cada rol accede a funcionalidades diferentes.

| Rol | Uso dentro de Payments App |
|-----|-----------------------------|
| `rider` | Pagar reservas, consultar pagos realizados, consultar saldo a favor disponible y utilizar crédito en próximos viajes. |
| `driver` | Consultar liquidaciones y configurar o consultar su cuenta de cobro, si corresponde. |
| `admin` | Gestionar reglas de precio, revisar cobros, consultar saldos a favor, auditar movimientos de crédito y administrar liquidaciones. |

Notas:

- El pasajero ya no necesita dejar cargado un método de pago para cobros automáticos.
- El pago se realiza al momento de confirmar la reserva, mediante una sesión de checkout en Payments App.
- El saldo a favor es administrado exclusivamente por Payments App.
- Rider App puede mostrar el saldo a favor o notificaciones relacionadas, pero no calcula ni modifica ese saldo.

## Consideración sobre métodos de pago

En esta etapa, el sistema no requiere que el pasajero guarde previamente un método de pago para cobros automáticos.

El pasajero paga directamente cada reserva desde Payments App mediante una sesión de checkout.

Por lo tanto:

- no es obligatorio almacenar un método de pago reutilizable del pasajero;
- no se ejecutan cobros automáticos al cierre T-1h;
- el cierre T-1h solo se utiliza para calcular el precio final y generar saldo a favor si corresponde.

En futuras etapas, si se decide volver a implementar cobros automáticos, se podrá incorporar nuevamente la vinculación de métodos de pago guardados.

---

## Identidad compartida entre servicios

Cada app utiliza el claim `sub` como identificador compartido del usuario.

Ejemplos:

- En Rider App, `sub` se guarda como `clerk_user_id` del pasajero.
- En Driver App, `sub` se guarda como `clerk_user_id` del conductor.
- En Payments App, `sub` se usa para asociar checkouts, cobros, saldo a favor, movimientos de crédito, cuentas de cobro y liquidaciones.
- En Feedback App, `sub` se usa para identificar autores y destinatarios de reseñas o reportes.

Las apps pueden tener perfiles locales propios, pero todos deben estar relacionados mediante `clerk_user_id`.

---
## Saldo a favor y usuario compartido

El saldo a favor pertenece al usuario identificado por Clerk.

La Payments App utiliza el claim `sub` del JWT como identificador del usuario y lo asocia internamente a su cuenta de crédito.

Ejemplo:

```text
sub = user_abc123
credit_account.user_id = user_abc123
```

Reglas:

- La Payments App es la fuente de verdad del saldo a favor.
- La Rider App puede consultar el saldo disponible mediante `GET /api/payments/users/:user_id/credit-balance`.
- La Rider App puede recibir notificaciones de crédito generado mediante `PATCH /api/reservations/:reservation_id/credit-adjustment`.
- La Rider App puede mostrar una notificación o toast al pasajero cuando se genera saldo a favor.
- La Rider App no debe calcular ni modificar el saldo a favor.
- El saldo a favor se aplica automáticamente en Payments App al crear un checkout para una nueva reserva.

Ejemplo de notificación al usuario:

```text
Tenés $1200 de saldo a favor para tu próximo viaje.
```


---


## Usuarios y datos locales por app

Aunque Clerk es la fuente de verdad de identidad, cada app puede guardar información local del usuario cuando esa información pertenece a su dominio.

| App | Datos locales asociados al usuario |
|-----|------------------------------------|
| **Rider App** | Perfil de pasajero, reservas, historial de viajes, notificaciones. |
| **Driver App** | Perfil de conductor, vehículos, pools aceptados, estado operativo. |
| **Payments App** | Checkouts de reserva, cobros, transacciones, saldo a favor, movimientos de crédito, reglas de precio, procesos de finalización de precio del pool, cuentas de cobro y liquidaciones. |
| **Feedback App** | Reseñas, promedios de calificación, reportes. |

---

## Consistencia entre Clerk y bases locales

Clerk es la fuente de verdad de identidad y roles globales.

Las apps mantienen datos propios asociados a `clerk_user_id`.

Estrategia:

- Cada app crea o actualiza el perfil local del usuario al primer login o cuando recibe una operación relacionada con ese usuario.
- Si cambia el rol de un usuario en Clerk, las apps deben respetar el nuevo rol al validar el JWT.
- Si se modifica un claim relevante como `role` o `company_code`, el usuario debe obtener un token actualizado para que las apps vean el cambio.
- Las apps no deben asumir permisos únicamente por datos locales; siempre deben validar el JWT.

---

## Consideraciones sobre múltiples roles

En esta etapa, se define un único rol principal por usuario:

```text
role
```

Por simplicidad, un usuario opera como `rider`, `driver` o `admin`.

Si en etapas futuras se permite que un mismo usuario sea pasajero y conductor al mismo tiempo, se podrá reemplazar `role` por un arreglo de roles:

```json
{
  "roles": ["rider", "driver"]
}
```

En esta primera etapa no se modela esa complejidad.

---

## Autenticación en APIs inter-servicio

## Autenticación en APIs inter-servicio

Las APIs inter-servicio deben validar autenticación.

Cuando la acción se realiza en nombre de un usuario autenticado, se debe propagar el JWT emitido por Clerk para identificarlo mediante `sub` y validar su `role`.

Ejemplos:

- Rider App solicita un checkout a Payments App en nombre de un pasajero autenticado.
- Rider App consulta el saldo a favor disponible de un pasajero.
- Feedback App registra una reseña realizada por un usuario autenticado.

Cuando la acción es ejecutada por un proceso interno o automático, puede utilizarse un mecanismo de autenticación inter-servicio acordado por el equipo.

Ejemplos:

- Payments App notifica a Rider App el resultado de un pago.
- Payments App notifica a Rider App que se generó saldo a favor.
- Driver App solicita a Payments App el cálculo de ajustes de crédito al cierre T-1h.
- Driver App notifica a Feedback App el inicio o fin de un recorrido.

En ambos casos, cada app debe verificar que la aplicación llamadora tenga permisos para ejecutar la acción solicitada.

---

## Resumen

| Concepto | Definición |
|----------|------------|
| Servicio de autenticación | Clerk |
| Identificador compartido | `sub`, usado localmente como `clerk_user_id` |
| Roles principales | `rider`, `driver`, `admin` |
| Claim industrial | `company_code` |
| Fuente de verdad de identidad | Clerk |
| Fuente de verdad de datos operativos | Cada app según su dominio |
| Fuente de verdad del saldo a favor | Payments App |
| Estrategia de autorización | Validar JWT y rol en cada app |
| Configuración importante | `company_code` debe incluirse explícitamente en el JWT Template o Session Claims |