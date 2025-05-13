# SYS-PRO Backend

Este repositorio contiene el backend del sistema SYS-PRO, una plataforma de gestión de proyectos técnicos desarrollada para optimizar la planificación, asignación de tareas y seguimiento de proyectos.

## Tecnologías utilizadas

- **Node.js** + **Express.js** – Servidor backend
- **MySQL** – Base de datos relacional
- **mysql2** – Cliente de MySQL para Node.js
- **dotenv** – Gestión de variables de entorno

## Estructura del proyecto
/controllers → Controladores de lógica de negocio
/routes → Rutas de la API
/models → Estructuras de datos y lógica auxiliar
/middlewares → Validaciones y control de acceso
/utils → Funciones reutilizables
/config → Configuración de conexión a base de datos

## Configuracion de variables
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=syspro
PORT=3001
