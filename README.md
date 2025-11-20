# PortalDesign

PortalDesign is a full-stack application with **login** and **role-based authorization** built with:

- **Backend:** Java 25, Spring Boot 3.5.5, REST, Log4j2
- **Frontend:** React (connects the backend REST APIs)
- **Auth:** Custom login + manual role checks

> Note: All authentication and authorization logic is implemented manually in controllers/services – **Spring Security is not used**.

---

## 1. Features

- User registration and login
- Credentials stored in a database (username, password, role)
- Password hashing (e.g. BCrypt or another hashing mechanism)
- Custom token-based authentication (no Spring Security)
- Role-based authorization:
  - Example roles: `USER`, `ADMIN`
  - Certain endpoints restricted to specific roles
- REST APIs consumed by a React frontend
- Centralized logging with Log4j2

---

## 2. Tech Stack

### Backend

- Java **JDK 25**
- Spring Boot **3.5.5**
  - Spring Web (REST endpoints)
  - Spring Data JPA (database access)
- Database: (e.g. PostgreSQL / MySQL / H2) – configurable
- Build tool: Maven
- Logging: Log4j2 (`log4j2-spring.xml`)

### Frontend

- React
- React Router (for routing + protected pages)
- Axios/Fetch (for calling backend APIs)
- LocalStorage/SessionStorage for storing auth token

---

## 3. Project Structure (Backend)

Backend root: `PortalDesign/`

```text
PortalDesign/
  src/
    main/
      java/
        org/project/
          Config/
            # General configuration (DB, CORS, custom interceptors/filters, etc.)
          Controller/
            # REST controllers (AuthController, UserController, AdminController...)
          dto/
            # DTOs for requests/responses (LoginRequest, LoginResponse, UserDto, etc.)
          entity/
            # JPA entities (User, Role, etc.)
          repository/
            # Spring Data repositories (UserRepository, RoleRepository...)
          service/
            # Service interfaces (AuthService, UserService...)
          serviceImpl/
            # Implementations of services (AuthServiceImpl, UserServiceImpl...)
      resources/
        application.properties
        log4j2-spring.xml
  pom.xml
  README.md
