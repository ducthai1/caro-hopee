# SG Internship Project - December 2025

A 5-week internship project with Frontend (React) and Backend (Java Spring Boot).

## 📁 Project Structure

```
sg-intern-dec-2025/
├── frontend/          # React + TypeScript + MUI
├── backend/           # Spring Boot + MySQL
└── README.md
```

## 🚀 Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will run at: `http://localhost:3000`

### Backend Setup

```bash
cd backend
mvn spring-boot:run
```

Backend will run at: `http://localhost:8080`

## 📋 System Requirements

### Frontend
- Node.js 16+ 
- npm or yarn

### Backend
- JDK 17+
- Maven 3.6+
- MySQL 8.0+ (or H2 for development)

## 🛠️ Technologies Used

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Material-UI (MUI)** - UI Components
- **React Router** - Routing
- **Axios** - HTTP Client
- **Context API** - State Management
- **ESLint + Prettier** - Code Quality

### Backend
- **Spring Boot 3.2** - Framework
- **Spring Data JPA** - Database Access
- **Spring Security** - Authentication & Authorization
- **MySQL** - Database
- **JWT** - Token Authentication
- **Lombok** - Boilerplate Reduction

## 📂 Detailed Structure

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/       # Context API (Auth, etc.)
│   ├── layouts/        # Layout components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   ├── utils/          # Helper functions
│   └── mockData/       # Mock data for development
├── public/
└── package.json
```

### Backend Structure
```
backend/
├── src/main/java/com/internship/backend/
│   ├── controller/     # REST Controllers
│   ├── service/        # Business Logic
│   ├── repository/     # Data Access Layer
│   ├── model/          # Entity Classes
│   ├── dto/            # Data Transfer Objects
│   ├── config/         # Configuration (CORS, Security)
│   ├── exception/      # Exception Handlers
│   └── security/       # Security Configuration
└── src/main/resources/
    └── application.properties
```

## 🔐 Environment Variables

### Frontend
Create `.env` file in `frontend/` directory:
```
REACT_APP_API_BASE_URL=http://localhost:8080/api
```

### Backend
Configure in `backend/src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=your_password
```

## 📝 Git Flow

1. **Create new branch:**
   ```bash
   git checkout -b feature/[feature-name]
   ```

2. **Commit code:**
   ```bash
   git commit -m "feat: description"
   ```

3. **Push branch:**
   ```bash
   git push origin feature/[feature-name]
   ```

4. **Create Merge Request to `develop` branch**

⚠️ **Note:** Do not push directly to `main`. Must create MR and get reviewed before merging.

## 📅 5-Week Roadmap

### Week 1: Foundation & Setup
- ✅ Environment setup
- ✅ Project structure
- ✅ Basic FE-BE connection
- ⏳ Database Design finalization
- ⏳ API Spec finalization

### Week 2: Core Development
- ⏳ UI Slicing
- ⏳ CRUD APIs
- ⏳ Mock Data

### Week 3: Integration
- ⏳ API Integration
- ⏳ Authentication
- ⏳ State Management

### Week 4: Polish & Advanced
- ⏳ Validation
- ⏳ Error Handling
- ⏳ Role-based Access

### Week 5: Testing & Deploy
- ⏳ Bug Fixing
- ⏳ Deploy (Vercel + Render)
- ⏳ Presentation

## 📚 Reference Documentation

- [React Documentation](https://react.dev/)
- [Material-UI Documentation](https://mui.com/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security Documentation](https://spring.io/projects/spring-security)

## 👥 Team

- **Mentor FE:** Mr. Cong Duc
- **Mentor BE:** Mr. Toan
- **Reviewer:** Mr. Cong Duc

## 📞 Contact

If you have any questions, please create an issue or contact the mentor.

---

**Good luck with your internship! 🎉**
