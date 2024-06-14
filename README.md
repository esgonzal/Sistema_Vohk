# Sistema web para la administración y gestión de cerraduras inteligentes

## Resumen

Este es el repositorio del Sistema Web para la administración y gestión de cerraduras inteligentes, también llamado de manera no oficial Sistema Vohk. En este sistema web se pueden administrar las cerraduras previamente asociadas con la aplicación móvil Vohk. En este sistema web se pueden realizar las siguientes acciones utilizando la API TTLock:

    Visualizar todos los métodos de apertura de una cerradura.
    Crear nuevos métodos de apertura para una cerradura.
    Editar métodos de apertura existentes de una cerradura.
    Borrar métodos de apertura de una cerradura.
    Visualizar los registros de acceso de una cerradura de los últimos 6 meses.
    Y más.

El sistema se integra con la API TTLock para proporcionar estas funcionalidades.

## Tecnologías

Frontend

    Angular: Versión 16.2.11

Backend

    Node.js: Versión 16.14.2

API

 [TTLock Cloud API V3](https://euopen.ttlock.com/document/doc?urlName=cloud%2FerrorCodeEn.html)

## Vistas

### 1. Login

El sistema hace uso de la función API de TTLock "Get access token" para verificar si la cuenta ya existe. De ser así, el token queda guardado temporalmente en el backend para ser usado por la cuenta en futuras funciones.

<!-- ![Login](URL_de_la_imagen) -->

---

### 2. Comunidades

En esta vista el usuario puede visualizar sus cerraduras de acuerdo a la organización que le dió. De esta manera, solo se cargan las cerraduras de una comunidad a la vez para no demorar el tiempo de carga. Se pueden crear nuevas comunidades, eliminar existentes, o agregar/remover cerraduras a una comunidad. Para avanzar a la siguiente vista, se tiene que presionar sobre una cerradura.

<!-- ![Comunidades](URL_de_la_imagen) -->

---

### 3. Cerradura

En esta vista se puede visualizar las características de los métodos de acceso de la cerradura. También se pueden visualizar los registros de los últimos 6 meses. Se puede editar el nombre y fecha de validación de los accesos, o bien, eliminarlos.

<!-- ![Cerradura](URL_de_la_imagen) -->

---


