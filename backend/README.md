# Backend - Spring Boot

## Requirements

- JDK 17 or higher
- Maven 3.6+
- MySQL 8.0+ (or H2 for development)

## Setup

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Configure Database:**
   - Open file `src/main/resources/application.properties`
   - Update MySQL connection information:
     ```
     spring.datasource.username=root
     spring.datasource.password=your_password
     ```
   - Or use H2 (already configured, just uncomment)

3. **Run application:**
   ```bash
   mvn spring-boot:run
   ```

4. **Test API:**
   - Open Postman or browser
   - GET `http://localhost:8080/api/hello`
   - Result: `{"message": "Hello World"}`

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/internship/backend/
│   │   │   ├── controller/     # REST Controllers
│   │   │   ├── service/        # Business Logic
│   │   │   ├── repository/     # Data Access Layer
│   │   │   ├── model/          # Entity Classes
│   │   │   ├── dto/            # Data Transfer Objects
│   │   │   ├── config/         # Configuration Classes
│   │   │   ├── exception/      # Exception Handlers
│   │   │   └── security/        # Security Configuration
│   │   └── resources/
│   │       └── application.properties
│   └── test/                   # Unit Tests
└── pom.xml
```

## API Endpoints

### Public Endpoints
- `GET /api/hello` - Test endpoint

### Protected Endpoints (require authentication)
- Other endpoints will be added week by week

## Git Flow

1. Create new branch: `git checkout -b feature/[feature-name]`
2. Commit code: `git commit -m "feat: description"`
3. Push branch: `git push origin feature/[feature-name]`
4. Create Merge Request to `develop` branch

