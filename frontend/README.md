# Frontend - React + TypeScript

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   Update `REACT_APP_API_BASE_URL` if needed.

3. **Run application:**
   ```bash
   npm start
   ```
   Application will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/        # Reusable components
│   └── PrivateRoute.tsx
├── contexts/          # Context API (State Management)
│   └── AuthContext.tsx
├── layouts/           # Layout components
│   └── MainLayout.tsx
├── pages/             # Page components
│   ├── LoginPage.tsx
│   └── HomePage.tsx
├── services/          # API services
│   ├── axiosClient.ts
│   └── api.ts
├── types/             # TypeScript types
│   └── index.ts
├── utils/             # Helper functions
│   ├── constants.ts
│   └── helpers.ts
└── mockData/          # Mock data
    └── index.ts
```

## Technologies

- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Material-UI** - UI Components
- **React Router** - Routing
- **Axios** - HTTP Client
- **React Hook Form + Yup** - Form Validation
- **Context API** - State Management
- **ESLint + Prettier** - Code Quality

## Code Style

- Use **Prettier** to format code automatically
- Use **ESLint** to check code quality
- Component names: **PascalCase** (e.g., `LoginPage.tsx`)
- File names: **camelCase** for utilities (e.g., `axiosClient.ts`)

## Git Flow

1. Create branch: `git checkout -b feature/[feature-name]`
2. Commit: `git commit -m "feat: description"`
3. Push: `git push origin feature/[feature-name]`
4. Create MR to `develop`

## Development Tips

- Use **Mock Data** in `mockData/` when BE is not ready
- Use **React DevTools** to debug
- Use **Axios Interceptors** to handle authentication automatically
- Use **Context API** for simple state management
