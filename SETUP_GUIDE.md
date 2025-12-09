# Project Setup Guide

## 📋 Setup Checklist

### Frontend Setup

- [ ] Install Node.js (version 16+)
- [ ] Clone repository
- [ ] Navigate to `frontend` directory
- [ ] Run `npm install`
- [ ] Create `.env` file from `.env.example`
- [ ] Run `npm start`
- [ ] Verify application runs at `http://localhost:3000`

### Backend Setup

- [ ] Install JDK 17+
- [ ] Install Maven 3.6+
- [ ] Install MySQL 8.0+ (or use H2)
- [ ] Clone repository
- [ ] Navigate to `backend` directory
- [ ] Configure `application.properties` with database information
- [ ] Run `mvn spring-boot:run`
- [ ] Test API at `http://localhost:8080/api/hello`

## 🔧 Setup Details

### 1. Frontend

```bash
cd frontend
npm install
npm start
```

**Note:**
- If you encounter port already in use error, change port in `.env` or kill the process using port 3000
- Make sure you've created `.env` file with `REACT_APP_API_BASE_URL=http://localhost:8080/api`

### 2. Backend

#### Option 1: Using MySQL

1. Create database:
   ```sql
   CREATE DATABASE internship_db;
   ```

2. Update `application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/internship_db
   spring.datasource.username=root
   spring.datasource.password=your_password
   ```

3. Run application:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

#### Option 2: Using H2 (Development)

1. Comment MySQL config in `application.properties`
2. Uncomment H2 config:
   ```properties
   spring.datasource.url=jdbc:h2:mem:testdb
   spring.datasource.driver-class-name=org.h2.Driver
   spring.h2.console.enabled=true
   spring.h2.console.path=/h2-console
   ```

3. Run application and access H2 Console at `http://localhost:8080/h2-console`

## ✅ Verify Setup

### Frontend
- [ ] Application opens at `http://localhost:3000`
- [ ] No errors in console
- [ ] Login page displays correctly

### Backend
- [ ] API `GET http://localhost:8080/api/hello` returns `{"message": "Hello World"}`
- [ ] No errors in console
- [ ] Database connection successful

## 🐛 Troubleshooting

### Frontend cannot connect to Backend
- Check if Backend is running
- Check `REACT_APP_API_BASE_URL` in `.env`
- Check CORS config in Backend

### Backend cannot connect to Database
- Check if MySQL is running
- Check username/password in `application.properties`
- Check if database has been created

### Port already in use
- Frontend: Change port in `.env` or kill process
- Backend: Change `server.port` in `application.properties`

## 📚 Reference Documentation

- [React Setup](https://react.dev/learn/start-a-new-react-project)
- [Spring Boot Setup](https://spring.io/guides/gs/spring-boot/)
- [MySQL Setup](https://dev.mysql.com/doc/)
