# Nest - AI-Powered Smart Bookmarking & Knowledge Management

Nest is an advanced Chrome extension that revolutionizes how you save, organize, and interact with web content. It combines intelligent bookmarking with cutting-edge AI features, visual highlighting, and powerful productivity tools, all accessible through a beautiful sidebar interface.

## ✨ Core Features

### 🔗 Smart Link Management
- **One-Click Saving**: Save any webpage instantly with browser action, context menu, or keyboard shortcuts
- **AI-Powered Summaries**: Automatically generates intelligent summaries of saved content using OpenAI
- **Inbox System**: Temporary holding area for quick saves before organizing
- **Smart Collections**: Create custom folders with AI-powered auto-organization
- **Advanced Search**: Full-text search across titles, notes, summaries, categories, and tags
- **URL Detection**: Smart duplicate detection and link validation

### 🎨 Visual Highlighting System
- **Text Highlighting**: Select and save specific text passages with visual markers
- **7 Color Options**: Yellow, Blue, Green, Pink, Purple, Orange, Red
- **4 Style Options**: Gradient, Solid, Underline, Outline
- **Cross-Site Compatibility**: Works on most websites with graceful degradation
- **Persistent Highlights**: Visual markers remain when you revisit pages
- **Highlight Management**: Click highlights to view details or remove them
- **Smart Site Detection**: Automatically handles problematic sites with user feedback

### 🤖 AI-Powered Intelligence

#### AI Insights & Analysis
- **Content Analysis**: AI analyzes saved links for key topics and themes
- **Smart Questions**: Generate comprehension questions from highlights and links
- **Automatic Flashcards**: Create study cards from saved content
- **Cross-References**: Detect relationships between different pieces of content
- **Reading Recommendations**: Personalized suggestions based on your interests

#### Auto-Organization Features
- **AI Auto-Organize**: One-click organization of all inbox items
- **Smart Categorization**: Intelligent category suggestions based on content
- **Auto-Tagging**: AI-powered tag suggestions with confidence scoring
- **Collection Matching**: Automatically suggests the best collection for each link

### 📊 Analytics & Productivity

#### Reading Analytics Dashboard
- **Activity Tracking**: Monitor reading habits and engagement patterns
- **Key Metrics**: Items read, daily averages, reading streaks, knowledge growth
- **Time Analysis**: Peak reading hours and productivity insights
- **Progress Tracking**: Visual charts showing your learning journey
- **Goal Setting**: Track reading goals and achievement streaks

#### Focus Mode & Productivity Tools
- **Multiple Focus Types**: Reading, Research, and Distraction-free modes
- **Timer Functionality**: Customizable durations from 5-120 minutes
- **Site Blocking**: Block distracting sites during focus sessions
- **Goal Tracking**: Set and monitor focus session goals
- **Session Analytics**: Track productivity patterns over time

#### Command Palette
- **Quick Actions**: Fast access to all features via `Ctrl+K` (or `Cmd+K`)
- **Fuzzy Search**: Find links, collections, and actions instantly
- **Keyboard Navigation**: Full keyboard control for power users
- **Smart Suggestions**: Context-aware command recommendations

### 🔄 Advanced Organization

#### Knowledge Graph
- **Visual Connections**: Interactive canvas showing relationships between content
- **AI-Powered Relationships**: Automatic detection of content connections
- **Multiple Node Types**: Links, highlights, notes, and tags visualization
- **Interactive Controls**: Zoom, pan, and filter capabilities
- **Relationship Strength**: Visual indicators of connection confidence

#### Smart Collections
- **AI-Powered Collections**: Automatically updating collections based on rules
- **Collection Templates**: Pre-built collections for common use cases
- **Auto-Update Rules**: Collections that grow based on content patterns
- **Sharing Capabilities**: Share collections publicly with generated links

#### Rich Annotations
- **Voice Memos**: Record and attach voice notes to any saved content
- **Rich Text Notes**: Full formatting support for detailed annotations
- **Note Organization**: Tag and categorize your annotations
- **Cross-Linking**: Connect notes to multiple pieces of content

### 🌐 Content Tools

#### Screenshot Tool
- **Full-Page Capture**: Save entire webpage screenshots
- **Selective Areas**: Capture specific regions of pages
- **Annotation Tools**: Mark up screenshots with notes and highlights
- **Storage Integration**: Screenshots saved alongside bookmarks

#### Floating AI Assistant
- **Context-Aware Help**: AI assistant that understands current page content
- **Quick Questions**: Ask questions about the current page
- **Content Summarization**: Get instant summaries of long articles
- **Research Assistance**: Help with fact-checking and analysis

#### Sticky Notes
- **Page-Specific Notes**: Add persistent notes to any webpage
- **Visual Positioning**: Notes stay anchored to specific page locations
- **Rich Formatting**: Support for formatted text and links
- **Note Management**: Organize and search across all sticky notes

### 📱 User Experience

#### Modern Interface
- **Sidebar Design**: Persistent, collapsible sidebar with clean aesthetics
- **Responsive Layout**: Works beautifully on any screen size
- **Dark Mode Ready**: CSS structured for future dark mode implementation
- **Accessibility**: WCAG-compliant design with keyboard navigation
- **Mobile Optimized**: Touch-friendly interfaces for mobile devices

#### Customization Options
- **Compact View Mode**: Space-efficient layout option
- **Keyboard Shortcuts**: Fully customizable hotkeys
- **New Tab Override**: Custom new tab page with your content
- **Notification Settings**: Configurable alerts and confirmations
- **Privacy Controls**: Fine-grained privacy and sharing settings

#### Smart Notifications
- **Toast System**: Real-time feedback for all operations
- **Progress Indicators**: Clear status updates for long operations
- **Error Handling**: Graceful error recovery with user guidance
- **Success Confirmation**: Visual confirmation of completed actions

### 🔄 Sync & Integration

#### Tab Sync Mode
- **Multi-Tab Management**: View and save all open browser tabs
- **Bulk Operations**: Save multiple tabs at once
- **Tab Organization**: Organize open tabs into collections
- **Session Management**: Save and restore browsing sessions

#### Data Management
- **Local Storage**: Fast IndexedDB storage with offline access
- **Data Export**: Easy backup and migration capabilities
- **Privacy First**: All data stays on your device by default
- **Supabase Integration**: Optional cloud sync for cross-device access

#### Import/Export
- **Bookmark Import**: Import from browser bookmarks
- **Data Backup**: Export all data for backup purposes
- **Collection Sharing**: Share collections with generated links
- **Format Support**: Multiple export formats (JSON, CSV, HTML)

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Chrome browser (Manifest V3 compatible)

### Development Setup

1. **Clone and install dependencies**:
```bash
git clone <your-repo-url>
cd Nest
npm install
```

2. **Build the extension**:
```bash
# For development (with watch mode)
npm run dev

# For production build
npm run build
```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from your project

4. **Configure AI Features** (Optional):
   - Open the extension settings
   - Add your OpenAI API key for full AI functionality
   - Configure auto-tagging and categorization preferences

## 🔧 Development

### Project Structure
```
src/
├── background/          # Service worker scripts
│   └── background.ts    # Extension lifecycle, context menus, page saving
├── content/            # Content script for page interaction
│   ├── content.ts      # Text selection, highlighting, page analysis
│   ├── FloatingAI.tsx  # AI assistant overlay
│   ├── StickyNotes.tsx # Page-specific note system
│   └── ScreenshotTool.tsx # Screenshot capture tool
├── popup/              # Extension popup interface
│   ├── Popup.tsx       # Quick actions and save functionality
│   └── popup.css       # Popup styling
├── sidepanel/          # Main sidebar application
│   ├── Sidepanel.tsx   # Main React application
│   ├── components/     # Feature-specific React components
│   │   ├── AIInsights.tsx        # AI analysis and recommendations
│   │   ├── AnalyticsDashboard.tsx # Reading analytics and stats
│   │   ├── CommandPalette.tsx    # Quick action interface
│   │   ├── FocusMode.tsx         # Productivity timer and blocking
│   │   ├── KnowledgeGraph.tsx    # Visual relationship mapping
│   │   ├── RichAnnotations.tsx   # Voice memos and rich notes
│   │   ├── Settings.tsx          # Configuration interface
│   │   └── ...                   # Other feature components
│   └── sidepanel.css   # Main application styles
├── newtab/             # Custom new tab page
│   ├── NewTab.tsx      # New tab interface
│   └── newtab.css      # New tab styling
├── auth/               # Authentication system
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared type definitions
└── utils/              # Shared utilities
    ├── storage.ts      # IndexedDB storage manager
    ├── ai.ts           # OpenAI integration and AI services
    ├── analytics.ts    # Usage analytics and tracking
    ├── digest.ts       # Email digest generation
    └── supabase.ts     # Cloud sync and sharing
```

### Key Components

- **Background Script**: Handles extension lifecycle, context menus, keyboard shortcuts, and page saving
- **Content Script**: Manages text selection, highlighting, floating tools, and page content extraction
- **Sidepanel**: Main React application with full bookmark management and AI features
- **Popup**: Quick actions interface for saving pages and accessing the sidebar
- **Storage Manager**: Sophisticated IndexedDB wrapper with analytics and cross-reference support
- **AI Services**: OpenAI integration with fallback systems for offline functionality
- **Analytics Service**: Comprehensive usage tracking with privacy-first design

### Available Scripts

```bash
npm run dev          # Development build with watch mode
npm run build        # Production build for Chrome Web Store
npm run clean        # Clean build directory
```

## 🎯 Usage Guide

### Getting Started
1. **Install the Extension**: Load the unpacked extension in Chrome
2. **Save Your First Link**: Click the Nest icon and select "Save to Nest"
3. **Open the Sidebar**: Click the extension icon or use the sidebar button
4. **Explore Features**: Try highlighting text, using the command palette, or exploring AI insights

### Keyboard Shortcuts
- `Ctrl+Shift+S` (or `Cmd+Shift+S`): Save current page
- `Ctrl+Shift+I` (or `Cmd+Shift+I`): Save to inbox quickly
- `Ctrl+K` (or `Cmd+K`): Open command palette
- Text selection + click: Create highlights

### Saving Content
- **Browser Action**: Click the Nest icon for save options
- **Context Menu**: Right-click any page/link and select "Save to Nest"
- **Text Highlights**: Select text (10+ characters) and click "Save highlight"
- **Bulk Saving**: Use Tab Sync mode for multiple tabs

### Organization Workflow
1. **Inbox First**: All saves start in the inbox
2. **AI Auto-Organize**: Use the AI button to automatically organize content
3. **Manual Organization**: Drag items or use menus to move to collections
4. **Add Context**: Enhance with notes, tags, and voice memos
5. **Review & Connect**: Use the knowledge graph to see relationships

### AI Features
- **Auto-Summarization**: Enabled by default for all saved pages
- **Smart Suggestions**: Get tag and category suggestions for each link
- **Reading Assistant**: Ask questions about saved content
- **Cross-References**: Discover connections between your saved items
- **Productivity Insights**: Get personalized reading recommendations

## 🔮 AI Configuration

### OpenAI Integration
The extension includes comprehensive AI features powered by OpenAI:

1. **API Key Setup**: Add your OpenAI API key in Settings → AI Features
2. **Feature Configuration**: Enable/disable specific AI features
3. **Cost Management**: Monitor API usage in the settings panel
4. **Fallback Systems**: Basic functionality works without API key

### Customizing AI Behavior
Edit `src/utils/ai.ts` to:
- Configure different AI models (GPT-3.5, GPT-4)
- Adjust summary length and style preferences
- Add custom prompts for different content types
- Implement alternative AI providers (Anthropic, local models)
- Configure confidence thresholds for auto-organization

### AI Features Breakdown
- **Content Summarization**: Automatic summaries of saved pages
- **Tag Generation**: Smart tag suggestions based on content analysis
- **Category Detection**: Intelligent categorization with confidence scoring
- **Question Generation**: Study questions from highlights and articles
- **Cross-Reference Detection**: Relationship mapping between content
- **Reading Recommendations**: Personalized content suggestions

## 🎨 Customization

### Visual Customization
- **Highlight Colors**: 7 color options with custom styling
- **Interface Themes**: CSS variables for easy theme modification
- **Layout Options**: Compact view mode and responsive design
- **Icon Customization**: Replace icons with your preferred set

### Behavioral Customization
- **Auto-Save Settings**: Configure automatic saving behavior
- **Notification Preferences**: Customize alerts and confirmations
- **Keyboard Shortcuts**: Modify all hotkeys via Chrome settings
- **Privacy Controls**: Fine-tune data sharing and sync options

### Developer Customization
The codebase is designed for easy extension:
- **Plugin Architecture**: Add new features via component system
- **Storage Extensions**: Implement custom storage backends
- **AI Providers**: Integrate alternative AI services
- **Export Formats**: Add new data export options
- **Theme System**: Implement custom color schemes

## 🚧 Roadmap & Future Features

### Short-term Enhancements
- **Enhanced Mobile Support**: Improved touch interactions
- **Advanced Search Filters**: Date ranges, content types, reading status
- **Collaborative Features**: Shared collections and team workspaces
- **Enhanced Export Options**: PDF generation, note-taking app integration

### Long-term Vision
- **Multi-Browser Support**: Firefox and Safari extensions
- **Desktop Application**: Standalone app for power users
- **API Integration**: Connect with popular productivity tools
- **Machine Learning**: Local AI models for privacy-conscious users
- **Advanced Analytics**: Detailed learning analytics and insights

### Community Features
- **Public Collections**: Discover and follow other users' collections
- **Content Recommendations**: Community-driven content discovery
- **Template Sharing**: Share collection templates and workflows
- **Extension Marketplace**: Third-party plugins and integrations

## 🐛 Troubleshooting

### Common Issues

**Extension not loading**:
- Verify Node.js version (16+) and build completion
- Check that `dist` folder exists with compiled files
- Try reloading the extension in Chrome extensions page

**AI features not working**:
- Ensure OpenAI API key is correctly configured in settings
- Check API quota and billing status
- Verify internet connection for API requests

**Highlights not appearing**:
- Check if the site is in the problematic sites list
- Verify highlight settings in preferences
- Try refreshing the page after saving highlights

**Sidebar not opening**:
- Ensure sidepanel permission is granted
- Try clicking the extension icon rather than right-clicking
- Check for conflicts with other extensions

**Performance issues**:
- Clear extension data if storage becomes too large
- Disable unused AI features to reduce resource usage
- Check for Chrome updates and extension conflicts

### Debug Mode
Enable debug logging by setting `DEBUG=true` in the console:
```javascript
localStorage.setItem('NEST_DEBUG', 'true');
```

## 📄 Privacy & Security

### Data Handling
- **Local-First**: All data stored locally by default
- **Optional Cloud Sync**: Supabase integration for cross-device access
- **Privacy Controls**: Granular settings for data sharing
- **No Tracking**: No analytics or user tracking without consent

### AI Privacy
- **API Communication**: Direct communication with OpenAI (when configured)
- **Data Minimization**: Only necessary content sent for analysis
- **User Control**: All AI features can be disabled
- **Local Fallbacks**: Basic functionality without external services

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- **Code Standards**: TypeScript, React, and Chrome extension best practices
- **Feature Requests**: How to propose new features
- **Bug Reports**: Template for reporting issues
- **Pull Requests**: Review process and requirements

### Development Environment
- **Code Quality**: ESLint and Prettier configuration
- **Testing**: Jest setup for unit and integration tests
- **Documentation**: JSDoc comments and README updates
- **Version Control**: Conventional commit messages

---

**Built with modern web technologies**: React 18, TypeScript, Chrome Manifest V3, IndexedDB, OpenAI API, and Supabase. 