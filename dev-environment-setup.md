# Development Environment Setup Guide
**TWN to HelloKahwin Content Migration Tool**

## Overview
This guide outlines the development environment setup for a cross-platform desktop application that migrates WordPress content with machine translation capabilities. The application consists of three main components: Frontend (Electron), Backend (REST API), and Database (SQLite).

## Technology Stack

### Core Technologies
- **Frontend**: Electron + React (desktop application)
- **Backend**: Node.js/Express or Python/FastAPI (REST API server)
- **Database**: SQLite with JSON support (local storage)
- **Real-time Communication**: WebSocket for progress updates

### External Services
- **Translation Services**: Google Translate API or Azure Translator
- **WordPress Integration**: WordPress REST API v2

## Prerequisites

### System Requirements
- **Node.js**: v16+ (for Electron frontend)
- **Python**: v3.8+ (if using Python backend) OR Node.js v16+ (if using Node.js backend)
- **Git**: For version control
- **SQLite**: v3.35+ (for JSON support)

### Development Tools
- **Code Editor**: VS Code (recommended) with extensions:
  - ESLint/Prettier for code formatting
  - SQLite Viewer for database inspection
  - REST Client for API testing
- **API Testing**: Postman or similar REST client
- **Database Management**: DB Browser for SQLite

## Project Structure Setup

```
hellokahwin/
├── frontend/          # Electron + React application
├── backend/           # REST API server
├── database/          # SQLite schema and migrations
├── shared/            # Shared types and utilities
├── docs/              # Documentation
└── scripts/           # Build and deployment scripts
```

## Development Environment Configuration

### 1. Database Setup (Foundation Layer)

**Priority**: Highest - Required by both backend and frontend

**Tasks to Complete First**:
- DB-001: Core content storage schema
- DB-005: Migration system

**Setup Steps**:
1. Create SQLite database file
2. Run initial migrations (001_initial_schema.sql)
3. Seed development data
4. Configure database connection strings

**Environment Variables**:
```bash
DATABASE_PATH=./data/hellokahwin.db
DATABASE_MODE=development
BACKUP_ENABLED=true
```

### 2. Backend API Setup (Service Layer)

**Priority**: High - Required by frontend

**Tasks to Complete First**:
- BACK-001: WordPress REST API integration
- BACK-006: Configuration management
- BACK-007: Error handling system

**Setup Steps**:
1. Initialize backend project structure
2. Configure API routes and middleware
3. Set up database connection
4. Implement basic WordPress API integration
5. Configure environment variables

**Environment Variables**:
```bash
PORT=3001
NODE_ENV=development
DATABASE_URL=sqlite:./data/hellokahwin.db
CORS_ORIGIN=http://localhost:3000

# WordPress Configuration
WP_SOURCE_URL=https://twn.example.com
WP_TARGET_URL=https://hellokahwin.example.com

# Translation Service
TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=your_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### 3. Frontend Application Setup (UI Layer)

**Priority**: Medium - Depends on backend API

**Tasks to Complete First**:
- FRONT-001: Application shell
- FRONT-008: UI component library

**Setup Steps**:
1. Initialize Electron + React project
2. Configure build tools and bundling
3. Set up routing and navigation
4. Implement global state management
5. Configure API client

**Environment Variables**:
```bash
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENVIRONMENT=development
```

## Initial Development Sequence

### Phase 1: Foundation (Week 1)
1. **Database Schema** (DB-001, DB-005)
   - Create SQLite database
   - Implement migration system
   - Set up core tables

2. **Backend Core** (BACK-001, BACK-006)
   - Basic API server setup
   - WordPress integration service
   - Configuration management

### Phase 2: Core Features (Week 2-3)
1. **Content Management** (BACK-001, FRONT-002)
   - Content fetching API
   - Content discovery interface

2. **Translation System** (BACK-002, BACK-003, FRONT-003)
   - Translation service integration
   - Job orchestration
   - Progress tracking interface

### Phase 3: User Experience (Week 4)
1. **Preview and Publishing** (BACK-004, BACK-005, FRONT-004, FRONT-005)
   - Content preview system
   - Publishing workflow
   - Queue management

## Configuration Files

### Backend Configuration (config/development.json)
```json
{
  "database": {
    "type": "sqlite",
    "database": "./data/hellokahwin.db",
    "synchronize": false,
    "migrations": ["./migrations/*.sql"]
  },
  "wordpress": {
    "rateLimit": {
      "requestsPerMinute": 60,
      "concurrentRequests": 5
    }
  },
  "translation": {
    "batchSize": 10,
    "retryAttempts": 3,
    "timeoutMs": 30000
  }
}
```

### Frontend Configuration (electron/main.js)
```javascript
const isDev = process.env.NODE_ENV === 'development';
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false
  }
});
```

## Development Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "dev:backend": "nodemon backend/server.js",
    "dev:frontend": "electron-forge start",
    "dev:full": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "test": "jest",
    "build": "electron-forge make"
  }
}
```

## Testing Setup

### Backend Testing
- **Unit Tests**: Jest + Supertest for API endpoints
- **Integration Tests**: Test WordPress API integration with mock server
- **Database Tests**: In-memory SQLite for fast test execution

### Frontend Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright for desktop application testing
- **Visual Tests**: Storybook for component development

## Security Considerations

### Credential Management
- Store sensitive configuration in environment variables
- Use encrypted storage for API keys in production
- Implement secure credential rotation

### API Security
- HTTPS enforcement for all external communications
- Input sanitization for user-provided content
- Rate limiting for API endpoints

## Common Issues and Solutions

### Database Connection
- **Issue**: SQLite file permissions
- **Solution**: Ensure write permissions in data directory

### API Rate Limiting
- **Issue**: WordPress API rate limits
- **Solution**: Implement exponential backoff and request queuing

### Cross-Platform Compatibility
- **Issue**: File path differences
- **Solution**: Use path.join() and avoid hardcoded separators

## Next Steps

1. **Immediate Setup** (Day 1):
   - Clone repository and install dependencies
   - Set up database schema (DB-001)
   - Configure development environment variables

2. **API Foundation** (Day 2-3):
   - Implement basic backend structure (BACK-001)
   - Test WordPress API connectivity
   - Set up error handling (BACK-007)

3. **Frontend Bootstrap** (Day 4-5):
   - Initialize Electron application (FRONT-001)
   - Create basic UI components (FRONT-008)
   - Establish API client connectivity

## Deployment Considerations

### Development Deployment
- Local SQLite database
- Local API server on port 3001
- Electron application for desktop testing

### Production Deployment
- Packaged Electron application with embedded API server
- Encrypted SQLite database
- Self-contained executable for end users

## Monitoring and Debugging

### Development Monitoring
- API response time logging
- Database query performance
- Memory usage tracking
- WebSocket connection status

### Debug Tools
- Chrome DevTools for frontend debugging
- Database query logging
- API request/response logging
- Error aggregation and reporting