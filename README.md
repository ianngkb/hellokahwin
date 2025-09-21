# HelloKahwin Migration Tool

A desktop application for migrating WordPress content from TWN to HelloKahwin with automated translation capabilities.

## Features

- **Content Discovery**: Browse and select content from TWN WordPress site
- **Batch Translation**: Translate content to Malay using Google Translate or Azure Translator
- **Review & Edit**: Side-by-side preview and editing of translated content
- **Publishing Management**: Queue and publish content to HelloKahwin WordPress site
- **Progress Tracking**: Real-time progress monitoring for all operations

## Quick Start

### Prerequisites

- Node.js 16+
- Python 3.8+ (optional, for Python backend)
- SQLite 3.35+

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd hellokahwin
npm run setup
```

2. **Configure environment variables:**
```bash
# Copy and edit backend configuration
cp .env.example .env

# Copy and edit frontend configuration
cp frontend/.env.example frontend/.env
```

3. **Start the development environment:**
```bash
npm run dev:full
```

This will start both the backend API server (port 3001) and the Electron frontend application.

## Development

### Project Structure

```
hellokahwin/
├── backend/           # REST API server (Node.js/Express)
├── frontend/          # Electron + React application
├── database/          # SQLite schema and migrations
├── shared/            # Shared types and utilities
├── scripts/           # Build and deployment scripts
└── data/              # SQLite database storage
```

### Available Scripts

- `npm run dev:full` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only the backend API server
- `npm run dev:frontend` - Start only the Electron frontend
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed development data
- `npm run build` - Build both backend and frontend for production
- `npm run test` - Run all tests
- `npm run package` - Package Electron app for distribution

### Environment Configuration

#### Backend (.env)
```bash
PORT=3001
DATABASE_PATH=./data/hellokahwin.db
WP_SOURCE_URL=https://twn.example.com
WP_TARGET_URL=https://hellokahwin.example.com
GOOGLE_TRANSLATE_API_KEY=your_api_key
```

#### Frontend (frontend/.env)
```bash
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

## Usage

1. **Configure WordPress Connections**: Set up source (TWN) and target (HelloKahwin) WordPress site credentials in Settings

2. **Fetch Content**: Use Content Discovery to browse and select posts from TWN

3. **Translate Content**: Start batch translation operations in Translation Workspace

4. **Review Translations**: Review and edit translated content in Review Workspace

5. **Publish Content**: Queue and publish content to HelloKahwin in Publishing Dashboard

## Architecture

### Backend (Node.js/Express)
- RESTful API for all operations
- WordPress REST API integration
- Machine translation service integration
- WebSocket for real-time progress updates
- SQLite database for local storage

### Frontend (Electron + React)
- Cross-platform desktop application
- Zustand for state management
- Tailwind CSS for styling
- Real-time updates via WebSocket

### Database (SQLite)
- Local content storage
- Translation job tracking
- Publishing queue management
- Configuration storage

## API Endpoints

### Content Management
- `GET /api/content/fetch` - Fetch WordPress content
- `GET /api/content/preview/{id}` - Get content preview
- `GET /api/content` - List stored content

### Translation
- `POST /api/translation/batch` - Start batch translation
- `GET /api/translation/status/{jobId}` - Get translation status
- `WebSocket /ws/translation-progress` - Real-time progress updates

### Publishing
- `POST /api/publishing/queue` - Add to publishing queue
- `GET /api/publishing/status` - Get publishing status

### Configuration
- `GET /api/config/settings` - Get application settings
- `POST /api/config/validate` - Validate configuration

## Security

- All credentials stored encrypted locally
- HTTPS enforcement for external communications
- Input sanitization and validation
- Rate limiting for API calls
- No data transmitted to unauthorized third parties

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and documentation, visit: https://docs.hellokahwin.com