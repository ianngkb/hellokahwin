# UI/UX Design Document: TWN to HelloKahwin Content Migration Tool

## Table of Contents
1. [Project Overview](#project-overview)
2. [Design Philosophy](#design-philosophy)
3. [User Research & Personas](#user-research--personas)
4. [Information Architecture](#information-architecture)
5. [Visual Design System](#visual-design-system)
6. [Component Library](#component-library)
7. [User Flows & Wireframes](#user-flows--wireframes)
8. [Screen Specifications](#screen-specifications)
9. [Accessibility Guidelines](#accessibility-guidelines)
10. [Responsive Design Strategy](#responsive-design-strategy)
11. [Error States & Loading Patterns](#error-states--loading-patterns)
12. [Performance Considerations](#performance-considerations)
13. [Implementation Guidelines](#implementation-guidelines)

---

## Project Overview

### Application Type
Desktop application built with Electron for cross-platform compatibility (Windows, macOS, Linux)

### Primary Purpose
Automate the migration and translation of WordPress content from TWN (English) to HelloKahwin (Malay), reducing manual processing time by 80% while maintaining content quality and SEO integrity.

### Key Workflows
1. **Fetch**: Discover and select TWN content for migration
2. **Translate**: Batch process content through machine translation
3. **Review**: Side-by-side content review and editing
4. **Publish**: Queue management and publishing to HelloKahwin

### Target Processing Volume
- 100+ posts in under 2 hours
- Real-time progress tracking
- Concurrent operation support

---

## Design Philosophy

### Core Principles

#### 1. Efficiency-First Design
- **Bulk Operations**: Every interface prioritizes batch processing over individual actions
- **Keyboard Shortcuts**: Essential operations accessible via keyboard for power users
- **Progress Transparency**: Real-time feedback for all long-running operations
- **Quick Actions**: Context-sensitive actions to minimize clicks

#### 2. Error Prevention & Recovery
- **Progressive Disclosure**: Complex operations broken into manageable steps
- **Validation Feedback**: Immediate validation with clear error messaging
- **Undo Capabilities**: Reversible actions where possible
- **Graceful Degradation**: Partial failure handling with recovery options

#### 3. Editorial Workflow Integration
- **Quality Gates**: Built-in review checkpoints before publishing
- **Content Comparison**: Side-by-side views for translation validation
- **Draft Management**: Safe preview environments before live publishing
- **Audit Trail**: Clear history of all modifications and decisions

#### 4. Desktop Application Patterns
- **Native Feel**: Platform-consistent UI elements and behaviors
- **Menu Integration**: Standard desktop menu patterns for file operations
- **Window Management**: Proper window state persistence and restoration
- **Offline Capability**: Local operation with minimal network dependency

---

## User Research & Personas

### Primary Persona: Content Editor (Sarah)

**Demographics & Context**
- Role: Content Editor at HelloKahwin
- Experience: 3+ years in content management, familiar with WordPress
- Daily workflow: Processes 15-20 articles manually, spends 60-70% time on mechanical tasks
- Pain points: Repetitive translation work, inconsistent quality, SEO element preservation

**Goals & Motivations**
- **Primary**: Reduce time spent on mechanical migration tasks
- **Secondary**: Maintain or improve content quality standards
- **Tertiary**: Learn new tools that improve overall productivity

**Technology Comfort**
- High comfort with WordPress admin interfaces
- Moderate comfort with new software tools
- Preference for clear visual feedback and guided workflows

**User Journey Pain Points**
1. **Discovery**: Finding and organizing content for migration
2. **Translation**: Managing inconsistent translation quality
3. **Review**: Time-consuming side-by-side comparison
4. **Publishing**: Risk of SEO element loss during transfer

### Secondary Persona: Project Manager (David)

**Demographics & Context**
- Role: Content Strategy Manager
- Experience: 5+ years managing editorial teams
- Focus: Process optimization, quality metrics, team productivity

**Goals & Motivations**
- **Primary**: Optimize team productivity and workflow efficiency
- **Secondary**: Maintain content quality standards and SEO performance
- **Tertiary**: Track metrics for process improvement

**Key Metrics Tracked**
- Content processing volume (posts per week)
- Quality scores (editor corrections per post)
- Time allocation (strategic vs. mechanical work)
- SEO preservation rates

---

## Information Architecture

### Navigation Structure

```
Main Application
├── Dashboard (Overview & Metrics)
├── Fetch Content
│   ├── Content Discovery
│   ├── Filtering & Search
│   └── Bulk Selection
├── Translation Workspace
│   ├── Job Queue Management
│   ├── Progress Tracking
│   └── Error Handling
├── Review & Edit
│   ├── Side-by-Side Preview
│   ├── Inline Editing
│   └── Quality Validation
├── Publishing Dashboard
│   ├── Publishing Queue
│   ├── Status Monitoring
│   └── Publication History
└── Settings
    ├── WordPress Connections
    ├── Translation Services
    ├── User Preferences
    └── Export/Import
```

### Content Status Flow

```
Content Workflow States:
new → fetched → translated → reviewed → queued → published

Status Indicators:
● Gray: New/Unfetched
● Blue: Fetched/Ready
● Yellow: Translation in Progress
● Orange: Needs Review
● Green: Ready to Publish
● Purple: Published Successfully
● Red: Error/Failed
```

### Data Relationships

```
Content Hierarchy:
Posts (1:N)
├── Translations (1:1 per language)
├── Taxonomies (1:N categories/tags)
├── Media Files (1:N attachments)
└── Mappings (1:1 source to target)

Job Relationships:
Translation Jobs (1:N)
└── Job Items (1:1 per post)

Publishing Relationships:
Publishing Queue (1:N)
└── Queue Items (1:1 per post)
```

---

## Visual Design System

### Color Palette

#### Primary Colors
```css
/* Brand Colors */
--primary-blue: #2563eb;      /* Primary actions, links */
--primary-blue-dark: #1d4ed8; /* Hover states */
--primary-blue-light: #3b82f6; /* Active states */

/* Semantic Colors */
--success-green: #059669;     /* Completed actions */
--warning-orange: #d97706;    /* Needs attention */
--error-red: #dc2626;         /* Errors, failures */
--info-blue: #0284c7;         /* Information */
```

#### Neutral Colors
```css
/* Surface Colors */
--surface-primary: #ffffff;   /* Main content areas */
--surface-secondary: #f8fafc; /* Secondary backgrounds */
--surface-tertiary: #e2e8f0;  /* Borders, dividers */

/* Text Colors */
--text-primary: #0f172a;      /* Primary text */
--text-secondary: #475569;    /* Secondary text */
--text-tertiary: #94a3b8;     /* Placeholder, disabled */

/* Interactive Colors */
--interactive-hover: #f1f5f9; /* Hover backgrounds */
--interactive-active: #e2e8f0; /* Active/pressed states */
--interactive-focus: #3b82f6; /* Focus outlines */
```

#### Status Colors
```css
/* Content Status Colors */
--status-new: #6b7280;        /* New/unfetched content */
--status-fetched: #3b82f6;    /* Fetched content */
--status-translating: #f59e0b; /* Translation in progress */
--status-review: #ea580c;     /* Needs review */
--status-ready: #059669;      /* Ready to publish */
--status-published: #7c3aed;  /* Published successfully */
--status-error: #dc2626;      /* Error state */
```

### Typography

#### Font Stack
```css
/* Primary Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Roboto', 'Helvetica Neue', Arial, sans-serif;

/* Monospace Font */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code',
             'SF Mono', Consolas, monospace;
```

#### Type Scale
```css
/* Heading Scale */
--text-xs: 0.75rem;    /* 12px - Captions, labels */
--text-sm: 0.875rem;   /* 14px - Body text, form inputs */
--text-base: 1rem;     /* 16px - Default body text */
--text-lg: 1.125rem;   /* 18px - Large body text */
--text-xl: 1.25rem;    /* 20px - Section headings */
--text-2xl: 1.5rem;    /* 24px - Page headings */
--text-3xl: 1.875rem;  /* 30px - Primary headings */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### Spacing System

```css
/* Spacing Scale (8px base unit) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */

/* Component Spacing */
--spacing-component-sm: var(--space-3);  /* Small component padding */
--spacing-component-md: var(--space-4);  /* Default component padding */
--spacing-component-lg: var(--space-6);  /* Large component padding */

/* Layout Spacing */
--spacing-section: var(--space-8);       /* Between major sections */
--spacing-page: var(--space-12);         /* Page container padding */
```

### Border Radius & Shadows

```css
/* Border Radius */
--radius-sm: 0.125rem;   /* 2px */
--radius-md: 0.25rem;    /* 4px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-full: 9999px;   /* Fully rounded */

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Focus Shadow */
--shadow-focus: 0 0 0 3px rgb(59 130 246 / 0.1);
```

---

## Component Library

### Core Components

#### 1. Button Component

**Variants**
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  state: 'default' | 'loading' | 'disabled';
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}
```

**Visual Specifications**
```css
/* Primary Button */
.button-primary {
  background: var(--primary-blue);
  color: white;
  border: 1px solid var(--primary-blue);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: all 0.15s ease;
}

.button-primary:hover {
  background: var(--primary-blue-dark);
  border-color: var(--primary-blue-dark);
}

.button-primary:focus {
  box-shadow: var(--shadow-focus);
  outline: 2px solid transparent;
}

/* Size Variants */
.button-sm { padding: var(--space-2) var(--space-3); font-size: var(--text-sm); }
.button-md { padding: var(--space-3) var(--space-4); font-size: var(--text-base); }
.button-lg { padding: var(--space-4) var(--space-6); font-size: var(--text-lg); }
```

#### 2. Data Table Component

**Features**
- Sortable columns with visual indicators
- Multi-select with bulk actions
- Pagination with page size options
- Status indicators and badges
- Responsive column priority

**Structure**
```tsx
interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
  sortable?: boolean;
  selectable?: boolean;
  pagination?: PaginationConfig;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
  priority?: 'high' | 'medium' | 'low'; // For responsive hiding
}
```

**Accessibility Features**
- ARIA table semantics
- Keyboard navigation support
- Screen reader announcements
- Focus management

#### 3. Progress Tracker Component

**Types**
- Linear progress bars for individual operations
- Circular progress for overall completion
- Step-based progress for multi-phase operations
- Real-time updates via WebSocket integration

**Visual States**
```css
/* Progress Bar */
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--surface-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-blue);
  transition: width 0.3s ease;
  border-radius: var(--radius-full);
}

/* Status Variants */
.progress-success .progress-fill { background: var(--success-green); }
.progress-warning .progress-fill { background: var(--warning-orange); }
.progress-error .progress-fill { background: var(--error-red); }
```

#### 4. Preview Pane Component

**Layout**
- Side-by-side comparison view
- Single language view mode
- Synchronized scrolling
- Inline editing capabilities

**Features**
```tsx
interface PreviewPaneProps {
  originalContent: Content;
  translatedContent: Content;
  mode: 'split' | 'original' | 'translated';
  editable?: boolean;
  onContentChange?: (content: Content) => void;
  onValidation?: (errors: ValidationError[]) => void;
}
```

#### 5. Status Badge Component

**Status Mapping**
```tsx
const statusConfig = {
  new: { color: 'gray', label: 'New' },
  fetched: { color: 'blue', label: 'Fetched' },
  translating: { color: 'yellow', label: 'Translating' },
  translated: { color: 'orange', label: 'Needs Review' },
  reviewed: { color: 'green', label: 'Ready' },
  published: { color: 'purple', label: 'Published' },
  error: { color: 'red', label: 'Error' }
};
```

### Layout Components

#### 1. Application Shell

```tsx
interface AppShellProps {
  children: React.ReactNode;
  navigation: NavigationItem[];
  currentRoute: string;
  user?: User;
  statusBar?: React.ReactNode;
}
```

**Structure**
- Top menu bar (native desktop menus)
- Left navigation sidebar (primary workflow)
- Main content area (dynamic routing)
- Bottom status bar (global status, progress)

#### 2. Navigation Sidebar

**Navigation Items**
```tsx
const navigationItems = [
  {
    id: 'fetch',
    label: 'Fetch Content',
    icon: 'Download',
    route: '/fetch',
    badge?: number // Content count
  },
  {
    id: 'translate',
    label: 'Translation',
    icon: 'Languages',
    route: '/translate',
    badge?: number // Active jobs
  },
  {
    id: 'review',
    label: 'Review & Edit',
    icon: 'Edit',
    route: '/review',
    badge?: number // Pending reviews
  },
  {
    id: 'publish',
    label: 'Publishing',
    icon: 'Upload',
    route: '/publish',
    badge?: number // Queue count
  }
];
```

#### 3. Content Grid Layout

**Responsive Grid System**
```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tablet Layout */
@media (min-width: 768px) and (max-width: 1023px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## User Flows & Wireframes

### Primary User Flow: Bulk Content Migration

```
1. Content Discovery
   ├── Connect to TWN WordPress
   ├── Apply filters (date, category, tags)
   ├── Browse content table
   └── Select posts for migration

2. Translation Processing
   ├── Configure translation settings
   ├── Start batch translation job
   ├── Monitor real-time progress
   └── Handle translation errors

3. Content Review
   ├── Access review queue
   ├── Side-by-side content comparison
   ├── Make inline edits
   └── Approve for publishing

4. Publishing
   ├── Queue approved content
   ├── Configure publishing options
   ├── Execute publishing job
   └── Verify publication success
```

### Wireframe: Content Discovery Screen

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] TWN Migration Tool                            [_] [□] [×] │
├─────────────────────────────────────────────────────────────┤
│ [📁] Fetch Content     │                                     │
│ [🔄] Translation       │ Content Discovery                   │
│ [✏️] Review & Edit      │                                     │
│ [📤] Publishing        │ ┌─────────────────┐ [Search...]     │
│ [⚙️] Settings          │ │ Filter Options  │                 │
│                        │ │ ┌─────────────┐ │ [Select All]    │
│                        │ │ │Date Range   │ │                 │
│                        │ │ │Category     │ │ ┌─────────────┐ │
│                        │ │ │Tags         │ │ │Title   │Date│ │
│                        │ │ │Post Type    │ │ │─────────────│ │
│                        │ │ └─────────────┘ │ │[✓] Post 1   │ │
│                        │ └─────────────────┘ │[✓] Post 2   │ │
│ ┌────────────────────┐ │                     │[ ] Post 3   │ │
│ │Connection Status   │ │                     │[✓] Post 4   │ │
│ │🟢 TWN Connected    │ │                     └─────────────┘ │
│ │🟢 HelloKahwin OK   │ │                                     │
│ └────────────────────┘ │ [Fetch Selected] [Previous] [Next]  │
├─────────────────────────────────────────────────────────────┤
│ Status: Ready │ Selected: 3 posts │ Last sync: 2h ago        │
└─────────────────────────────────────────────────────────────┘
```

### Wireframe: Translation Workspace

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] TWN Migration Tool                            [_] [□] [×] │
├─────────────────────────────────────────────────────────────┤
│ [📁] Fetch Content     │                                     │
│ [🔄] Translation ◄     │ Translation Workspace               │
│ [✏️] Review & Edit      │                                     │
│ [📤] Publishing        │ ┌─────────────────────────────────┐ │
│ [⚙️] Settings          │ │ Current Job: Batch-001          │ │
│                        │ │ Progress: ████████░░ 80%        │ │
│                        │ │ 8 of 10 posts completed         │ │
│                        │ │ ETA: 2 minutes remaining        │ │
│                        │ └─────────────────────────────────┘ │
│ ┌────────────────────┐ │                                     │
│ │Translation Service │ │ ┌─Post 1─┐ ┌─Post 2─┐ ┌─Post 3─┐   │
│ │Google Translate    │ │ │   ✓    │ │   ✓    │ │   🔄   │   │
│ │Target: Malay       │ │ │Complete│ │Complete│ │Working │   │
│ │Quality: High       │ │ └────────┘ └────────┘ └────────┘   │
│ └────────────────────┘ │                                     │
│                        │ ┌─Post 4─┐ ┌─Post 5─┐ ┌─Post 6─┐   │
│ ┌────────────────────┐ │ │   ✓    │ │   ❌    │ │   ⏸️   │   │
│ │Job Queue           │ │ │Complete│ │ Error  │ │Pending │   │
│ │2 jobs pending      │ │ └────────┘ └────────┘ └────────┘   │
│ │1 job running       │ │                                     │
│ │0 jobs failed       │ │ [Pause Job] [Cancel] [View Errors] │
│ └────────────────────┘ │                                     │
├─────────────────────────────────────────────────────────────┤
│ Status: Translating │ 8/10 complete │ Queue: 2 pending      │
└─────────────────────────────────────────────────────────────┘
```

### Wireframe: Side-by-Side Review

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] TWN Migration Tool                            [_] [□] [×] │
├─────────────────────────────────────────────────────────────┤
│ [📁] Fetch Content     │                                     │
│ [🔄] Translation       │ Review & Edit                       │
│ [✏️] Review & Edit ◄   │                                     │
│ [📤] Publishing        │ Post: "How to Plan Your Wedding"   │
│ [⚙️] Settings          │ [◄ Previous] [Next ►] [Approve]    │
│                        │                                     │
│ ┌────────────────────┐ │ ┌──────────────┬──────────────────┐ │
│ │Review Queue        │ │ │   Original   │   Translation    │ │
│ │                    │ │ │   (English)  │    (Malay)      │ │
│ │[●] Post 1 - Active │ │ ├──────────────┼──────────────────┤ │
│ │[○] Post 2 - Pending│ │ │How to Plan   │Cara Merancang    │ │
│ │[○] Post 3 - Pending│ │ │Your Wedding  │Perkahwinan Anda  │ │
│ │[○] Post 4 - Pending│ │ │              │                  │ │
│ │                    │ │ │Planning a    │Merancang         │ │
│ │Total: 4 posts      │ │ │wedding can   │perkahwinan boleh │ │
│ │                    │ │ │be...         │menjadi...        │ │
│ └────────────────────┘ │ │              │                  │ │
│                        │ │[Edit Mode]   │[✏️ Edit]          │ │
│ ┌────────────────────┐ │ └──────────────┴──────────────────┘ │
│ │Translation Info    │ │                                     │
│ │Service: Google     │ │ [🔍 Validate] [💾 Save] [✅ Approve]│
│ │Confidence: 85%     │ │                                     │
│ │Edited: No          │ │                                     │
│ └────────────────────┘ │                                     │
├─────────────────────────────────────────────────────────────┤
│ Status: Reviewing │ 1 of 4 posts │ 3 pending approval      │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

### 1. Content Discovery Screen (`/fetch`)

**Purpose**: Browse and select TWN WordPress content for migration

**Key Components**
- Connection status indicators
- Content filtering sidebar
- Sortable data table with multi-select
- Bulk action buttons
- Pagination controls

**Layout Specifications**
```css
.fetch-screen {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  gap: var(--space-6);
  height: 100vh;
  padding: var(--space-6);
}

.filter-sidebar {
  grid-row: 1 / -1;
  background: var(--surface-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.content-table {
  overflow: auto;
  background: var(--surface-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-tertiary);
}
```

**Interaction Patterns**
- Shift+Click for range selection
- Ctrl/Cmd+Click for multi-selection
- Double-click to preview individual post
- Right-click for context menu

### 2. Translation Workspace (`/translate`)

**Purpose**: Monitor and manage batch translation operations

**Key Components**
- Active job progress display
- Individual post status cards
- Job queue management
- Error handling interface
- Translation service configuration

**Real-time Updates**
- WebSocket connection for progress updates
- Auto-refresh job status every 2 seconds
- Live error notifications
- Completion notifications

**State Management**
```tsx
interface TranslationState {
  activeJobs: TranslationJob[];
  queuedJobs: TranslationJob[];
  completedJobs: TranslationJob[];
  errors: TranslationError[];
  progress: {
    overall: number;
    current: {
      jobId: string;
      postId: string;
      percentage: number;
    };
  };
}
```

### 3. Review & Edit Screen (`/review`)

**Purpose**: Side-by-side content review with inline editing capabilities

**Key Components**
- Review queue sidebar
- Split-pane content viewer
- Inline editing interface
- Content validation tools
- Approval workflow

**Content Comparison Features**
- Synchronized scrolling between panes
- Highlighting of differences
- Word count comparison
- SEO element validation

**Editing Capabilities**
```tsx
interface EditingFeatures {
  richTextEditor: boolean;
  spellCheck: boolean;
  wordCount: boolean;
  undoRedo: boolean;
  autoSave: boolean;
  validationRules: ValidationRule[];
}
```

### 4. Publishing Dashboard (`/publish`)

**Purpose**: Manage publishing queue and monitor publication status

**Key Components**
- Publishing queue with drag-and-drop reordering
- Bulk publishing controls
- Publication status monitoring
- Publishing history log
- Error resolution interface

**Queue Management**
- Priority-based ordering
- Scheduled publishing support
- Draft vs. live publishing options
- Batch operations

### 5. Settings Screen (`/settings`)

**Purpose**: Configure WordPress connections, translation services, and user preferences

**Sections**
```tsx
interface SettingsConfig {
  wordpress: {
    source: WordPressConnection;
    target: WordPressConnection;
  };
  translation: {
    service: 'google' | 'azure' | 'aws';
    apiKey: string;
    targetLanguage: string;
    qualityThreshold: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };
  advanced: {
    batchSize: number;
    retryAttempts: number;
    apiTimeout: number;
  };
}
```

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

#### Color and Contrast
- **Minimum contrast ratio**: 4.5:1 for normal text, 3:1 for large text
- **Color independence**: No information conveyed by color alone
- **Status indicators**: Use icons + color + text labels
- **High contrast mode**: Support system high contrast preferences

```css
/* High Contrast Media Query */
@media (prefers-contrast: high) {
  :root {
    --primary-blue: #0000ff;
    --success-green: #008000;
    --error-red: #ff0000;
    --text-primary: #000000;
    --surface-primary: #ffffff;
  }
}
```

#### Keyboard Navigation
- **Tab order**: Logical, predictable tab sequence
- **Focus indicators**: Visible focus outlines (minimum 2px)
- **Keyboard shortcuts**: Essential operations accessible via keyboard
- **Focus management**: Proper focus restoration after modals/dialogs

```tsx
// Keyboard shortcuts configuration
const keyboardShortcuts = {
  'Ctrl+F': 'Open search',
  'Ctrl+A': 'Select all',
  'Ctrl+Shift+T': 'Start translation',
  'Ctrl+Shift+P': 'Publish selected',
  'Escape': 'Close modal/cancel operation',
  'Space': 'Toggle selection',
  'Enter': 'Confirm action'
};
```

#### Screen Reader Support
- **ARIA labels**: Descriptive labels for all interactive elements
- **Live regions**: Status updates announced to screen readers
- **Table semantics**: Proper table headers and relationships
- **Form labeling**: Explicit label-input associations

```jsx
// Screen reader announcements
<div aria-live="polite" aria-atomic="true">
  {`Translation progress: ${progress}% complete. ${processed} of ${total} posts processed.`}
</div>

// Table accessibility
<table role="table" aria-label="Content migration status">
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Title</th>
      <th scope="col">Status</th>
      <th scope="col">Progress</th>
    </tr>
  </thead>
</table>
```

#### Motor Accessibility
- **Click targets**: Minimum 44x44px touch targets
- **Timeout extensions**: Provide additional time for operations
- **Error prevention**: Confirmation dialogs for destructive actions
- **Input alternatives**: Multiple ways to accomplish tasks

### Assistive Technology Testing

#### Testing Checklist
- [ ] NVDA (Windows) - Free screen reader
- [ ] JAWS (Windows) - Professional screen reader
- [ ] VoiceOver (macOS) - Built-in screen reader
- [ ] Dragon NaturallySpeaking - Voice control software
- [ ] Switch Control (iOS/macOS) - Switch navigation
- [ ] Keyboard-only navigation testing

---

## Responsive Design Strategy

### Breakpoint System

```css
/* Breakpoint Variables */
:root {
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
  --breakpoint-2xl: 1536px; /* Extra large screens */
}

/* Media Query Mixins */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Desktop-First Approach

**Primary Target**: Desktop (1024px+)
- Full feature set
- Multi-column layouts
- Side-by-side content views
- Comprehensive data tables

**Tablet Adaptation** (768px - 1023px)
- Simplified navigation
- Stacked content layouts
- Condensed data tables
- Touch-friendly controls

**Mobile Compatibility** (320px - 767px)
- Single-column layout
- Collapsible navigation
- Card-based content display
- Essential features only

### Component Responsive Behavior

#### Navigation Sidebar
```css
/* Desktop: Always visible sidebar */
@media (min-width: 1024px) {
  .navigation-sidebar {
    position: fixed;
    width: 240px;
    height: 100vh;
  }
}

/* Tablet: Collapsible sidebar */
@media (max-width: 1023px) {
  .navigation-sidebar {
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .navigation-sidebar.open {
    transform: translateX(0);
  }
}
```

#### Data Tables
```css
/* Desktop: Full table layout */
@media (min-width: 1024px) {
  .data-table {
    display: table;
    width: 100%;
  }
}

/* Tablet/Mobile: Card layout */
@media (max-width: 1023px) {
  .data-table {
    display: block;
  }

  .data-table tr {
    display: block;
    margin-bottom: var(--space-4);
    border: 1px solid var(--surface-tertiary);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
}
```

#### Side-by-Side Preview
```css
/* Desktop: Split panes */
@media (min-width: 1024px) {
  .preview-panes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }
}

/* Tablet/Mobile: Stacked with tabs */
@media (max-width: 1023px) {
  .preview-panes {
    display: block;
  }

  .preview-tabs {
    display: flex;
    margin-bottom: var(--space-4);
  }
}
```

---

## Error States & Loading Patterns

### Error State Design

#### Error Classification
```tsx
interface ErrorState {
  type: 'network' | 'validation' | 'authorization' | 'server' | 'client';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  recovery?: RecoveryAction[];
  timestamp: Date;
}

interface RecoveryAction {
  label: string;
  action: () => void;
  primary?: boolean;
}
```

#### Error Display Patterns

**Inline Errors** (Form validation)
```jsx
<div className="form-field">
  <label htmlFor="api-key">Translation API Key</label>
  <input
    id="api-key"
    className={`input ${errors.apiKey ? 'input-error' : ''}`}
    aria-describedby="api-key-error"
  />
  {errors.apiKey && (
    <div id="api-key-error" className="error-message" role="alert">
      <Icon name="alert-circle" />
      {errors.apiKey}
    </div>
  )}
</div>
```

**Toast Notifications** (Operation feedback)
```jsx
<Toast variant="error" duration={5000}>
  <div className="toast-content">
    <Icon name="x-circle" />
    <div>
      <h4>Translation Failed</h4>
      <p>Unable to translate "How to Plan Your Wedding"</p>
    </div>
    <button onClick={retryTranslation}>Retry</button>
  </div>
</Toast>
```

**Error Boundaries** (Application crashes)
```jsx
<ErrorBoundary>
  <div className="error-boundary">
    <Icon name="alert-triangle" size="48" />
    <h2>Something went wrong</h2>
    <p>The application encountered an unexpected error.</p>
    <div className="error-actions">
      <button onClick={reloadApp}>Reload Application</button>
      <button onClick={reportError}>Report Error</button>
    </div>
  </div>
</ErrorBoundary>
```

#### Recovery Patterns

**Automatic Recovery**
- Network retry with exponential backoff
- Translation service failover
- Session restoration after app restart

**User-Initiated Recovery**
- Manual retry buttons
- Alternative action suggestions
- Data export options before retry

### Loading Patterns

#### Loading State Types

**Skeleton Screens** (Initial data loading)
```jsx
<div className="content-skeleton">
  <div className="skeleton-header" />
  <div className="skeleton-table">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton-cell" />
        <div className="skeleton-cell" />
        <div className="skeleton-cell" />
      </div>
    ))}
  </div>
</div>
```

**Progress Indicators** (Long operations)
```jsx
<ProgressTracker>
  <div className="progress-header">
    <h3>Translating Content</h3>
    <span>{progress.current} of {progress.total}</span>
  </div>
  <ProgressBar
    value={progress.percentage}
    max={100}
    aria-label={`Translation progress: ${progress.percentage}%`}
  />
  <div className="progress-details">
    <span>ETA: {estimatedTime}</span>
    <button onClick={pauseOperation}>Pause</button>
  </div>
</ProgressTracker>
```

**Spinner States** (Button actions)
```jsx
<Button loading={isSubmitting} disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Spinner size="sm" />
      Translating...
    </>
  ) : (
    'Start Translation'
  )}
</Button>
```

#### Loading Performance Optimization

**Progressive Enhancement**
- Load critical UI first
- Defer non-essential components
- Lazy load heavy components

**Perceived Performance**
- Optimistic UI updates
- Skeleton screens while loading
- Smooth transition animations

---

## Performance Considerations

### Rendering Performance

#### Virtual Scrolling
For large content lists (1000+ posts):
```tsx
interface VirtualizedTableProps {
  items: Post[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: Post, index: number) => React.ReactNode;
}

// Implementation using react-window or similar
<VirtualizedTable
  items={posts}
  itemHeight={60}
  containerHeight={500}
  renderItem={renderPostRow}
/>
```

#### Memoization Strategy
```tsx
// Expensive operations
const sortedPosts = useMemo(() => {
  return posts.sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });
}, [posts, sortBy]);

// Component memoization
const PostRow = memo(({ post, onSelect, selected }) => {
  return (
    <tr className={selected ? 'selected' : ''}>
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(post.id)}
        />
      </td>
      <td>{post.title}</td>
      <td>{post.status}</td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return prevProps.selected === nextProps.selected &&
         prevProps.post.id === nextProps.post.id &&
         prevProps.post.status === nextProps.post.status;
});
```

### Memory Management

#### Cleanup Patterns
```tsx
useEffect(() => {
  const interval = setInterval(updateProgress, 2000);
  const websocket = new WebSocket(WS_URL);

  return () => {
    clearInterval(interval);
    websocket.close();
  };
}, []);

// Large data cleanup
useEffect(() => {
  return () => {
    // Clear large arrays from memory
    setPosts([]);
    setTranslationJobs([]);
  };
}, []);
```

#### Bundle Optimization
- Code splitting by route
- Lazy loading of heavy components
- Tree shaking of unused libraries
- Optimized image assets

### Network Performance

#### API Request Optimization
```tsx
// Batch API requests
const batchRequests = async (postIds: string[]) => {
  const chunks = chunk(postIds, 10); // Process in chunks of 10
  const results = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(id => translatePost(id))
    );
    results.push(...chunkResults);

    // Brief pause between chunks to avoid rate limiting
    await delay(100);
  }

  return results;
};

// Request deduplication
const requestCache = new Map();
const cachedFetch = async (url: string) => {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }

  const promise = fetch(url).then(r => r.json());
  requestCache.set(url, promise);

  return promise;
};
```

---

## Implementation Guidelines

### Technology Stack Recommendations

#### Frontend Framework
```json
{
  "framework": "React 18+",
  "language": "TypeScript",
  "desktop": "Electron",
  "stateManagement": "Zustand",
  "styling": "Tailwind CSS",
  "testing": "Jest + React Testing Library"
}
```

#### Component Libraries
```json
{
  "ui": "Headless UI + Custom Components",
  "icons": "Heroicons",
  "dataVisualization": "Chart.js",
  "richText": "Tiptap",
  "virtualScroll": "react-window"
}
```

### File Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Table.tsx
│   │   ├── ProgressBar.tsx
│   │   └── index.ts
│   ├── layout/             # Layout components
│   │   ├── AppShell.tsx
│   │   ├── Navigation.tsx
│   │   └── StatusBar.tsx
│   └── features/           # Feature-specific components
│       ├── content/
│       ├── translation/
│       ├── review/
│       └── publishing/
├── screens/                # Main application screens
│   ├── FetchScreen.tsx
│   ├── TranslationScreen.tsx
│   ├── ReviewScreen.tsx
│   └── PublishScreen.tsx
├── hooks/                  # Custom React hooks
│   ├── useWebSocket.ts
│   ├── useTranslation.ts
│   └── useLocalStorage.ts
├── services/               # API and external services
│   ├── wordpress.ts
│   ├── translation.ts
│   └── websocket.ts
├── types/                  # TypeScript type definitions
│   ├── content.ts
│   ├── translation.ts
│   └── api.ts
├── utils/                  # Utility functions
│   ├── validation.ts
│   ├── formatting.ts
│   └── constants.ts
└── styles/                 # Global styles and themes
    ├── globals.css
    ├── components.css
    └── themes/
```

### Development Standards

#### Code Quality
```tsx
// TypeScript interfaces for all props
interface PostRowProps {
  post: Post;
  selected: boolean;
  onSelect: (id: string) => void;
  onPreview: (post: Post) => void;
}

// Consistent error handling
const useApiCall = <T>(apiFunction: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  return { data, error, loading, execute };
};
```

#### Testing Strategy
```tsx
// Component testing
describe('PostRow', () => {
  it('renders post information correctly', () => {
    const mockPost = createMockPost();

    render(
      <PostRow
        post={mockPost}
        selected={false}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('handles selection changes', async () => {
    const onSelect = jest.fn();
    const mockPost = createMockPost();

    render(
      <PostRow
        post={mockPost}
        selected={false}
        onSelect={onSelect}
        onPreview={jest.fn()}
      />
    );

    await user.click(screen.getByRole('checkbox'));
    expect(onSelect).toHaveBeenCalledWith(mockPost.id);
  });
});
```

### Deployment Considerations

#### Electron Configuration
```json
{
  "main": "dist/main.js",
  "build": {
    "appId": "com.hellokahwin.migration-tool",
    "productName": "TWN Migration Tool",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

#### Performance Monitoring
```tsx
// Performance tracking
const usePerformanceTracking = () => {
  const trackOperation = useCallback((operation: string, duration: number) => {
    console.log(`Operation: ${operation}, Duration: ${duration}ms`);

    // Send to analytics if configured
    if (window.analytics) {
      window.analytics.track('performance', {
        operation,
        duration,
        timestamp: Date.now()
      });
    }
  }, []);

  return { trackOperation };
};
```

---

This comprehensive UI/UX design document provides the foundation for implementing a professional, accessible, and efficient desktop application for content migration. The design system ensures consistency across all components while the detailed specifications guide implementation decisions.

The document prioritizes user productivity, accessibility compliance, and technical performance to deliver an application that meets the stated goal of reducing content migration time by 80% while maintaining quality standards.