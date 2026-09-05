# Frontend Tasks: TWN to HelloKahwin Content Migration Tool
**PRD Reference**: TWN-HelloKahwin-Migration-Tool-PRD.md

## Overview
The frontend team is responsible for developing a cross-platform desktop application interface that enables content editors to efficiently migrate and translate WordPress content. The application provides content discovery, bulk processing management, side-by-side preview, and publishing workflow controls while maintaining responsive UI throughout long-running operations.

## Dependencies on Backend & Database
- **Backend API Services**: Content fetching, translation processing, publishing operations
- **Database Layer**: Local content storage, status tracking, mapping records
- **Critical Handoffs**: API contract adherence, event-driven status updates, shared data validation

## Component Map & Routes

### Main Application Shell
- **MainWindow**: Primary desktop window container with navigation and global state
- **NavigationSidebar**: Primary workflow navigation (Fetch → Translate → Review → Publish)
- **StatusBar**: Global application status, progress indicators, connection status
- **SettingsPanel**: Configuration management for WordPress sites and translation services

### Core Feature Screens
- **ContentDiscovery** (`/fetch`): TWN content browsing and selection interface
- **TranslationWorkspace** (`/translate`): Bulk processing management and progress tracking
- **ReviewWorkspace** (`/review`): Side-by-side content preview and editing interface
- **PublishingDashboard** (`/publish`): Publishing queue management and status monitoring

### Supporting Components
- **ContentTable**: Sortable, filterable data grid with bulk selection capabilities
- **ProgressTracker**: Real-time progress visualization for batch operations
- **PreviewPane**: Dual-pane content preview with editing capabilities
- **ErrorHandler**: User-friendly error display with actionable guidance

## State & Data Flow

### State Management Architecture
- **Global State**: Application configuration, user preferences, connection status
- **Feature State**: Content lists, translation status, review queue, publishing queue
- **Local Component State**: UI interactions, form data, temporary editing state

### Data Sources
- **API Data**: WordPress content, translation results, publishing responses (via Backend)
- **Local Storage**: User preferences, window state, recent selections
- **Database Sync**: Content status, mapping records, cached metadata (via Database)

### Event-Driven Updates
- **Translation Progress**: Real-time updates during batch processing
- **Status Changes**: Content workflow state transitions
- **Error Events**: API failures, validation errors, connectivity issues

## Tasks

### FRONT-001
- **Task ID**: FRONT-001
- **Summary**: Create main application shell with navigation and global state management
- **Details**: Implement Electron-based desktop application with primary navigation, status bar, and global state container. Include window management, menu system, and basic routing infrastructure.
- **Interfaces/Contracts**:
  - Window state persistence via LocalStorage API
  - Global event bus for cross-component communication
  - Settings schema: `{wpSites: {source: {url, auth}, target: {url, auth}}, translationService: {provider, apiKey}, ui: {theme, language}}`
- **Dependencies**: None (foundational task)
- **Acceptance Criteria**:
  - Desktop application launches with responsive main window
  - Navigation sidebar with 4 primary workflow sections
  - Global settings accessible and persistable
  - Window state restoration on application restart
  - Cross-platform compatibility (Windows, macOS, Linux)
- **Test Plan**: Unit tests for routing, integration tests for window management, manual testing across platforms
- **Est. Effort**: L

### FRONT-002
- **Task ID**: FRONT-002
- **Summary**: Implement content discovery interface for TWN WordPress content browsing
- **Details**: Create content table with sorting, filtering, pagination, and bulk selection. Display post metadata, status indicators, and provide search/filter capabilities for efficient content discovery.
- **Interfaces/Contracts**:
  - Consumes: `GET /api/content/fetch` from Backend
  - Props: `{posts: Post[], loading: boolean, error: string, pagination: PaginationInfo}`
  - Events: `content-selected`, `fetch-requested`, `filter-changed`
- **Dependencies**: FRONT-001, BACK-001
- **Acceptance Criteria**:
  - Sortable table with columns: title, date, author, status, word count
  - Search functionality across title and content
  - Date range filtering and category/tag filtering
  - Bulk selection with "select all" functionality
  - Pagination with configurable page sizes
  - Loading states and error handling
- **Test Plan**: Unit tests for filtering logic, integration tests with mock API data, accessibility testing for table navigation
- **Est. Effort**: L

### FRONT-003
- **Task ID**: FRONT-003
- **Summary**: Build translation workspace with batch processing management and progress tracking
- **Details**: Implement interface for managing bulk translation operations with real-time progress tracking, error handling, and retry capabilities. Include operation queue management and status visualization.
- **Interfaces/Contracts**:
  - Consumes: `POST /api/translation/batch`, `GET /api/translation/status/{jobId}` from Backend
  - WebSocket: `translation-progress` events for real-time updates
  - Component props: `{selectedPosts: Post[], translationJobs: Job[], onTranslateStart: Function}`
- **Dependencies**: FRONT-002, BACK-002, BACK-003
- **Acceptance Criteria**:
  - Batch translation initiation with selected content
  - Real-time progress bar with individual item status
  - Pause/resume functionality for long operations
  - Error display with retry options for failed items
  - Estimated completion time calculations
  - Operation history and status tracking
- **Test Plan**: Unit tests for progress calculations, integration tests with WebSocket events, stress testing with large batches
- **Est. Effort**: L

### FRONT-004
- **Task ID**: FRONT-004
- **Summary**: Create side-by-side content preview and editing interface
- **Details**: Implement dual-pane preview showing original English and translated Malay content with inline editing capabilities, formatting preservation, and content validation.
- **Interfaces/Contracts**:
  - Consumes: `GET /api/content/preview/{id}` from Backend
  - Editor API: `{content: string, onChange: Function, validation: ValidationRules}`
  - Save events: `content-modified`, `validation-failed`
- **Dependencies**: FRONT-001, BACK-004
- **Acceptance Criteria**:
  - Split-pane view with synchronized scrolling
  - Inline editing with rich text formatting
  - Real-time content validation and error highlighting
  - Undo/redo functionality for edits
  - Content comparison highlighting (changed sections)
  - Mobile-responsive layout for smaller screens
- **Test Plan**: Unit tests for editor functionality, visual regression tests for formatting, usability testing with content editors
- **Est. Effort**: L

### FRONT-005
- **Task ID**: FRONT-005
- **Summary**: Implement publishing dashboard with queue management and status monitoring
- **Details**: Create interface for managing publishing queue, monitoring publication status, and handling publishing errors with comprehensive status tracking and retry mechanisms.
- **Interfaces/Contracts**:
  - Consumes: `POST /api/publishing/queue`, `GET /api/publishing/status` from Backend
  - Publishing events: `publish-queued`, `publish-completed`, `publish-failed`
  - Queue schema: `{posts: PublishItem[], status: QueueStatus, errors: ErrorInfo[]}`
- **Dependencies**: FRONT-004, BACK-005
- **Acceptance Criteria**:
  - Publishing queue with drag-and-drop reordering
  - Bulk publishing operations with progress tracking
  - Draft vs. immediate publishing options
  - Error handling with detailed failure reasons
  - Publishing history and audit trail
  - Confirmation dialogs for destructive operations
- **Test Plan**: Unit tests for queue management, integration tests with publishing API, error scenario testing
- **Est. Effort**: M

### FRONT-006
- **Task ID**: FRONT-006
- **Summary**: Build comprehensive error handling and user feedback system
- **Details**: Implement global error handling, user notification system, and actionable error guidance throughout the application with consistent messaging and recovery options.
- **Interfaces/Contracts**:
  - Error schema: `{type: ErrorType, message: string, code: string, recovery: RecoveryAction[]}`
  - Notification API: `{show: Function, dismiss: Function, clear: Function}`
  - Error events: `error-occurred`, `error-resolved`, `recovery-attempted`
- **Dependencies**: FRONT-001, FRONT-002, FRONT-003, FRONT-004, FRONT-005
- **Acceptance Criteria**:
  - Global error boundary with graceful degradation
  - Toast notifications for operation status
  - Detailed error modals with troubleshooting steps
  - Network connectivity detection and messaging
  - Automatic retry mechanisms for recoverable errors
  - Error logging for debugging support
- **Test Plan**: Unit tests for error handling logic, integration tests for API error scenarios, usability testing for error recovery
- **Est. Effort**: M

### FRONT-007
- **Task ID**: FRONT-007
- **Summary**: Implement user preferences and configuration management
- **Details**: Create settings interface for WordPress connections, translation service configuration, UI preferences, and data export/import functionality.
- **Interfaces/Contracts**:
  - Settings schema: `{connections: ConnectionConfig[], preferences: UIPreferences, translation: TranslationConfig}`
  - Validation API: `{validateConnection: Function, testTranslation: Function}`
  - Export/Import: JSON format for configuration backup
- **Dependencies**: FRONT-001, BACK-006
- **Acceptance Criteria**:
  - WordPress connection configuration with validation
  - Translation service setup and API key management
  - UI theme and language preferences
  - Configuration export/import functionality
  - Connection testing with status feedback
  - Secure credential storage indicators
- **Test Plan**: Unit tests for validation logic, integration tests for connection testing, security testing for credential handling
- **Est. Effort**: M

### FRONT-008
- **Task ID**: FRONT-008
- **Summary**: Develop responsive UI components and accessibility features
- **Details**: Implement reusable UI component library with accessibility compliance, responsive design, and consistent styling throughout the application.
- **Interfaces/Contracts**:
  - Component library: `{Button, Table, Modal, Form, ProgressBar, Notification}`
  - Theme API: `{colors: ColorPalette, typography: TypeScale, spacing: SpacingScale}`
  - Accessibility: WCAG 2.1 AA compliance
- **Dependencies**: FRONT-001
- **Acceptance Criteria**:
  - Comprehensive component library with documentation
  - Keyboard navigation support throughout app
  - Screen reader compatibility with ARIA labels
  - High contrast mode support
  - Responsive breakpoints for various screen sizes
  - Consistent visual design system
- **Test Plan**: Accessibility testing with screen readers, visual regression tests, responsive design testing
- **Est. Effort**: L

## Contracts Reference

### Props Interfaces
```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  date: string;
  status: ContentStatus;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  wordCount: number;
}

interface TranslationJob {
  id: string;
  postIds: string[];
  status: JobStatus;
  progress: number;
  startTime: string;
  estimatedCompletion?: string;
  errors: TranslationError[];
}

interface PublishItem {
  postId: string;
  title: string;
  targetStatus: 'draft' | 'publish';
  publishDate?: string;
  status: PublishStatus;
}
```

### Event Contracts
- **content-selected**: `{postIds: string[], action: 'translate' | 'review' | 'publish'}`
- **translation-progress**: `{jobId: string, progress: number, currentItem: string, errors: Error[]}`
- **publish-completed**: `{postId: string, targetUrl: string, publishedAt: string}`

## Analytics/Telemetry Hooks
- User workflow progression tracking (Fetch → Translate → Review → Publish)
- Feature utilization metrics (bulk vs. individual operations)
- Error frequency and recovery success rates
- Performance metrics (loading times, operation durations)
- User interaction patterns (most used features, workflow efficiency)

## UI Integration Checklist

### Loading States
- [ ] Skeleton screens for content loading
- [ ] Progress indicators for long operations
- [ ] Spinner states for API calls
- [ ] Background process indicators

### Error States
- [ ] Network disconnection handling
- [ ] API timeout and rate limit messaging
- [ ] Validation error highlighting
- [ ] Recovery action buttons

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation flow
- [ ] Screen reader announcements
- [ ] High contrast support
- [ ] Focus management

### Responsive Design
- [ ] Desktop primary layout (1024px+)
- [ ] Tablet adaptation (768px-1023px)
- [ ] Mobile compatibility (320px-767px)
- [ ] Text scaling support

## Open Questions

1. **Desktop Framework**: Should we use Electron, Tauri, or native development? Electron recommended for rapid development and web technology reuse.

2. **State Management**: Redux, Zustand, or Context API for state management? Recommend Zustand for simplicity and performance.

3. **UI Framework**: React + Electron or Vue + Electron? React recommended for team familiarity and ecosystem.

4. **Real-time Updates**: WebSocket vs. Server-Sent Events vs. Polling for progress updates? WebSocket recommended for bidirectional communication.

5. **Offline Capabilities**: What functionality should remain available offline? Priority: content review and editing, defer: fetching and publishing.

6. **Theme Support**: Dark mode requirement and customization level? Basic dark/light theme toggle recommended for MVP.

7. **Internationalization**: UI language support beyond English? Defer to post-MVP unless specifically required.

8. **Performance Targets**: Specific performance benchmarks for large content sets (1000+ posts)? Need requirements for memory usage and rendering performance.