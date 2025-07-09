# Nest - Smart Bookmarks & Notes

<div align="center">
  <img src="packages/chrome-extension/src/icons/icon128.png" alt="Nest Icon" width="128" height="128">
  
  **An intelligent knowledge management Chrome extension with AI-powered features**
  
  [![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available%20Soon-green.svg)](https://chrome.google.com/webstore/)
  [![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)](packages/chrome-extension/manifest.json)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](packages/chrome-extension/tsconfig.json)
</div>

## 📚 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [User Guide](#-user-guide)
- [AI Features](#-ai-features)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Privacy & Security](#-privacy--security)
- [Development](#-development)
- [Contributing](#-contributing)
- [Support](#-support)

## ✨ Features

### 🎯 Core Knowledge Management
- **Smart Bookmarking**: Save web pages with automatic AI categorization and tagging
- **Inbox System**: GTD-style workflow for processing and organizing saved content
- **Smart Collections**: Dynamic collections that auto-update based on content and behavior
- **Text Highlighting**: Save text highlights with 7 customizable colors and 4 styles
- **Visual Annotations**: Rich text notes, voice memos, and multimedia attachments
- **Full-Text Search**: Advanced search across all content, highlights, and notes
- **Tag Management**: Intelligent tagging with auto-suggestions and filtering

### 🤖 AI-Powered Intelligence
- **Floating AI Assistant**: Context-aware chat overlay for any webpage with quick actions
- **Corpus Chat**: Natural language search and Q&A over your entire knowledge base  
- **Auto-Summarization**: AI-generated summaries for saved links and highlights
- **Smart Categorization**: Automatic content categorization using advanced ML
- **Auto-Tagging**: Intelligent tag suggestions based on content analysis
- **Cross-References**: Automatically find relationships between saved content
- **Reading Analytics**: Track habits, generate insights, and get personalized recommendations
- **AI Insights**: Generate questions, flashcards, and learning materials from content
- **Smart Suggestions**: Context-aware next-best-action recommendations

### 🎨 Modern User Experience  
- **Sidepanel Interface**: Native Chrome sidepanel with smooth animations
- **Floating Window**: Raycast-style popup window for quick access
- **Maximize View**: Full-screen interface for detailed work
- **Compact View**: Space-efficient layout for power users
- **Responsive Design**: Beautiful experience on all screen sizes
- **Accessibility**: WCAG compliant with full keyboard navigation
- **Dark Mode Ready**: CSS variables prepared for dark theme
- **Command Palette**: Quick actions with fuzzy search (`Ctrl+K`)

### 🔧 Advanced Productivity Features
- **Focus Mode**: Distraction-free reading with site blocking and timers
- **Knowledge Graph**: Interactive visualization of content relationships
- **Tab Sync**: Save multiple tabs at once to collections
- **Screenshot Tool**: Built-in screenshot capture with OCR text extraction
- **Sticky Notes**: Persistent notes on webpages
- **Activity Tracking**: Monitor reading patterns and productivity metrics
- **Link Health Monitoring**: Automatic dead link detection with Wayback Machine recovery
- **Duplicate Detection**: Smart merge suggestions for similar content
- **Background Automation**: Set-and-forget content organization and maintenance

### 🔄 Data Management & Sync
- **Export/Import**: Complete data backup and restore functionality
- **Supabase Integration**: Optional cloud sync across devices
- **Offline Support**: Full functionality without internet connection
- **Conflict Resolution**: Smart handling of sync conflicts
- **Data Integrity**: Atomic operations with comprehensive error handling

## 🚀 Installation

### Method 1: Chrome Web Store (Coming Soon)
*Extension will be available on the Chrome Web Store soon*

### Method 2: Developer Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/nest-extension.git
   cd nest-extension
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   # or npm install
   ```

3. **Build the Extension**
   ```bash
   yarn build:extension
   # or npm run build:extension
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `packages/chrome-extension/dist` folder
   - The Nest extension should now appear in your extensions

5. **Initial Setup**
   - Click the Nest icon in your Chrome toolbar to open the sidepanel
   - Complete the onboarding flow
   - Optionally add your OpenAI API key for enhanced AI features
   - Configure your preferences in Settings

## 🎯 Quick Start

### Save Your First Link
1. Navigate to any webpage
2. Click the Nest icon or use `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)
3. Choose to save to inbox or a specific collection
4. Add tags, notes, or highlights as desired
5. Click "Save to Nest"

### Access Your Content
- **Sidepanel**: Click the Nest icon for the main interface
- **Floating Window**: Use `Ctrl+K` command palette → "Open Floating Window"
- **Maximize View**: Click the maximize button for full-screen experience

### Use the AI Assistant
1. Press `Alt+A` (or `Cmd+A` on Mac) on any webpage
2. The floating AI assistant appears with page context
3. Use quick actions: "Summarize", "Key Points", "Generate Questions"
4. Ask natural language questions about the content

### Create Your First Collection
1. Open the sidepanel and go to Collections
2. Click "New Collection" and choose a name
3. Drag items from your inbox or use "Move to Collection"
4. Configure collection settings for auto-organization

## 📖 User Guide

### Inbox Zero Workflow
Transform information overload into organized knowledge:

1. **Capture Everything**: Save links, highlights, and notes to your inbox
2. **Process Regularly**: Review inbox items and categorize them
3. **Organize Intelligently**: Use AI suggestions or manual organization
4. **Archive Completed**: Move processed items to collections
5. **AI Auto-Organize**: Enable one-click AI organization for bulk processing

### Smart Collections
Dynamic collections that automatically organize your knowledge:

- **Recent Activity**: Recently accessed or modified content
- **Unread Queue**: Content you haven't opened yet
- **Learning Materials**: Tutorials, courses, and educational content
- **Work Projects**: Professional and project-related resources
- **Research Topics**: Academic papers, articles, and research materials
- **Code & Development**: GitHub repos, documentation, and technical resources
- **News & Updates**: Current events and industry news

### Advanced Text Highlighting
Professional-grade highlighting with customization:

1. **Select and Highlight**: Choose text and click the highlight button
2. **Choose Style**: 7 colors × 4 styles = 28 highlighting options
3. **Add Context**: Rich text notes with formatting support
4. **Voice Annotations**: Record voice memos for complex thoughts
5. **Cross-Reference**: Link highlights to related content
6. **Export Options**: Generate PDFs or export to note-taking apps

### AI-Powered Search
Natural language search over your entire knowledge base:

- **Semantic Search**: "Find articles about machine learning ethics"
- **Question Answering**: "What did I save about React performance?"
- **Cross-References**: "Show me related content to this article"
- **Content Discovery**: "What should I read next about TypeScript?"
- **Citation Mode**: Get exact sources with confidence scores

### Focus Mode & Productivity
Deep work features for distraction-free learning:

- **Reading Sessions**: Timed focus sessions with progress tracking
- **Site Blocking**: Block distracting websites during focus time
- **Goal Setting**: Set and track reading/learning goals
- **Analytics Dashboard**: Detailed insights into reading habits
- **Knowledge Growth**: Track how your knowledge base evolves

## 🤖 AI Features

### Floating AI Assistant
Context-aware AI companion for any webpage:

**Activation:**
- `Alt+A` / `Cmd+A`: Toggle assistant
- Command Palette: "Toggle Floating AI"
- Sidepanel: Click AI assistant button

**Quick Actions:**
- **Summarize Page**: Concise 1-2 sentence summaries
- **Explain Simply**: Break down complex concepts
- **Key Points**: Extract main takeaways and insights
- **Generate Questions**: Create discussion and study questions
- **Action Items**: Derive actionable steps and todos
- **Research Topics**: Suggest related areas to explore
- **Compare**: Compare current page with saved content

### Corpus Chat (Ask Nest)
Natural language interface to your knowledge:

```
You: "What have I learned about React hooks?"
Nest: "Based on 12 saved articles and 8 highlights, here are the key concepts you've collected about React hooks..."

You: "Find conflicting information about AI safety"
Nest: "I found 3 items that present different perspectives on AI safety approaches..."
```

### AI Configuration
**Setup OpenAI Integration:**
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Settings → AI Features → Add API Key
3. Enable desired AI features
4. Configure usage limits and preferences

**Fallback Functionality:**
- All features work without API key using rule-based algorithms
- Local processing for privacy-sensitive content
- Gradual enhancement when AI is available

## ⌨️ Keyboard Shortcuts

### Global Actions
- `Ctrl+Shift+S` / `Cmd+Shift+S`: Save current page
- `Ctrl+Shift+I` / `Cmd+Shift+I`: Save to inbox
- `Alt+A` / `Cmd+A`: Toggle floating AI assistant
- `Ctrl+K` / `Cmd+K`: Open command palette
- `Ctrl+Shift+F` / `Cmd+Shift+F`: Focus mode toggle

### Navigation
- `Escape`: Close modals and overlays
- `Tab` / `Shift+Tab`: Navigate interface elements
- `Enter`: Activate buttons and links
- `Arrow Keys`: Navigate lists and cards
- `/`: Focus search box

### Text Operations
- **Select text** + **Click**: Create highlight
- **Double-click highlight**: Edit note
- **Right-click highlight**: Context menu
- `Ctrl+Z` / `Cmd+Z`: Undo last action

### Power User Shortcuts
- `g i`: Go to inbox
- `g c`: Go to collections  
- `g s`: Go to settings
- `g a`: Go to analytics
- `?`: Show all shortcuts

## 🔒 Privacy & Security

### Local-First Architecture
- **Primary Storage**: All data stored locally in Chrome's secure storage
- **No Tracking**: Zero analytics, telemetry, or user behavior tracking
- **Minimal Permissions**: Only requests necessary browser permissions
- **Content Isolation**: Web page content processed locally when possible

### Optional Cloud Features
- **Supabase Integration**: Opt-in cloud sync for cross-device access
- **Encrypted Sync**: All synced data encrypted in transit and at rest
- **Self-Hosted Option**: Can be configured with self-hosted Supabase instance
- **Data Portability**: Full export/import with no vendor lock-in

### AI Processing
- **Transparent Usage**: Clear indicators when content is sent to AI services
- **User Control**: All AI features can be disabled individually
- **Privacy Mode**: Process sensitive content locally without AI
- **No AI Storage**: OpenAI doesn't store your data permanently
- **Rate Limiting**: Built-in protections against excessive API usage

### Browser Permissions Explained
- `storage`: Save bookmarks, settings, and user data
- `activeTab`: Read current page content for saving and AI features
- `sidePanel`: Display the main extension interface
- `contextMenus`: Add right-click options for quick actions
- `tabs`: Manage tab operations and multi-tab saves
- `notifications`: Show helpful alerts and reminders
- `windows`: Support floating window mode
- `alarms`: Background automation and monitoring

## 🛠️ Development

### Project Architecture
```
nest-extension/
├── packages/
│   ├── chrome-extension/     # Main Chrome extension
│   │   ├── src/
│   │   │   ├── background/   # Service worker & automation
│   │   │   ├── content/      # Web page interaction
│   │   │   ├── sidepanel/    # Main UI components
│   │   │   ├── popup/        # Quick actions popup
│   │   │   ├── maximize/     # Full-screen interface
│   │   │   ├── utils/        # Services & utilities
│   │   │   └── types/        # TypeScript definitions
│   │   └── manifest.json
│   ├── shared/               # Shared utilities and types
│   └── web-dashboard/        # Optional web interface
├── dev-notes.md             # Development documentation
└── package.json            # Monorepo configuration
```

### Technology Stack
- **Frontend**: React 18, TypeScript, Modern CSS
- **Build**: Webpack with Chrome Extension optimization
- **AI**: OpenAI GPT API with local fallbacks
- **Search**: Custom embeddings with IndexedDB storage
- **Backend**: Optional Supabase for cloud sync
- **Storage**: Chrome Extension Storage API
- **Testing**: Jest, React Testing Library (planned)

### Development Commands
```bash
# Install dependencies
yarn install

# Start development mode (watch rebuild)
yarn dev:extension

# Build for production
yarn build:extension

# Type checking
yarn type-check

# Lint code
yarn lint

# Clean build files
yarn clean
```

### Key Services & Components

**Core Services:**
- `AIService`: OpenAI integration with fallbacks
- `EmbeddingsService`: Vector search and similarity
- `StorageService`: Data persistence and sync
- `ActivityAnalyzer`: User behavior insights
- `SuggestionEngine`: Smart recommendations
- `LinkMonitor`: Health checking and recovery
- `DuplicateDetector`: Content deduplication

**Main Components:**
- `Sidepanel`: Primary interface with navigation
- `CorpusChat`: AI chat over knowledge base
- `FloatingAI`: Context-aware assistant overlay
- `KnowledgeGraph`: Interactive relationship visualization
- `AnalyticsDashboard`: Reading insights and metrics
- `FocusMode`: Productivity and distraction management
- `Settings`: Comprehensive configuration interface

### Adding New Features
1. **Plan the Feature**: Update dev-notes.md with requirements
2. **Create Types**: Add interfaces to `src/types/index.ts`
3. **Build Components**: Create React components in appropriate directories
4. **Add Services**: Implement business logic in `src/utils/`
5. **Update Storage**: Extend data models if needed
6. **Test Integration**: Verify with multiple websites and scenarios
7. **Update Documentation**: Add to README.md and user guide

## 🤝 Contributing

We welcome contributions from developers, designers, and knowledge workers!

### Quick Start for Contributors
1. **Fork & Clone**: Fork the repo and clone locally
2. **Setup**: Follow development installation steps
3. **Pick an Issue**: Check GitHub issues or create new ones
4. **Code**: Create feature branch and implement changes
5. **Test**: Test on multiple websites and scenarios
6. **Document**: Update relevant documentation
7. **Submit**: Create pull request with clear description

### Development Guidelines
- **TypeScript First**: All new code must be TypeScript
- **React Best Practices**: Use hooks, functional components
- **Accessibility**: Follow WCAG guidelines, test with screen readers
- **Performance**: Optimize for memory usage and responsiveness
- **Cross-Site Compatibility**: Test on variety of websites
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Documentation**: Update docs for user-facing changes

### Areas We Need Help
- **UI/UX Design**: Interface improvements and new features
- **Performance Optimization**: Memory usage and startup time
- **Cross-Browser Support**: Firefox and Safari compatibility
- **Mobile Experience**: Progressive web app features
- **Accessibility**: Screen reader and keyboard navigation
- **Testing**: Automated testing framework setup
- **Documentation**: User guides and developer docs
- **Internationalization**: Multi-language support

## 📞 Support

### Getting Help
- **GitHub Issues**: [Report bugs and request features](https://github.com/yourusername/nest-extension/issues)
- **Discussions**: [Community support and questions](https://github.com/yourusername/nest-extension/discussions)
- **Email**: [support@nest-extension.com](mailto:support@nest-extension.com)
- **Documentation**: Check this README and dev-notes.md

### Known Limitations
- **Site Compatibility**: Some sites (MSN, CNN, BBC) block highlighting due to shadow DOM
- **Performance**: Large knowledge bases (10,000+ items) may experience slower search
- **AI Features**: Require internet connection and API key for full functionality
- **Browser Limits**: Chrome extension storage limits (~10MB for local data)

### Troubleshooting

**Extension Not Loading?**
1. Check Chrome extensions page for error messages
2. Ensure Developer Mode is enabled
3. Try reloading the extension
4. Check console for JavaScript errors

**AI Features Not Working?**
1. Verify OpenAI API key in Settings → AI Features
2. Check internet connection
3. Verify API key has sufficient credits
4. Enable fallback mode for offline functionality

**Highlighting Issues?**
1. Try refreshing the page
2. Check if site blocks content modification
3. Verify extension has permission for the site
4. Some sites with heavy JavaScript may not support highlighting

**Sync Problems?**
1. Check Supabase connection in Settings
2. Verify internet connectivity
3. Check for storage quota limits
4. Try manual export/import as backup

**Performance Issues?**
1. Check Chrome's task manager for memory usage
2. Try compact view for better performance
3. Archive old content to reduce active dataset
4. Disable CPU-intensive features if needed

## 📈 Roadmap

### Current Version: 0.6.0
- ✅ Complete knowledge management platform
- ✅ AI-powered features with fallbacks
- ✅ Advanced productivity tools
- ✅ Comprehensive UI/UX

### Upcoming Features
- **Mobile Companion**: Progressive web app with native sharing
- **Team Collaboration**: Shared collections and knowledge bases
- **Advanced Analytics**: ML-powered insights and recommendations
- **Plugin Ecosystem**: Third-party integrations and extensions
- **Desktop App**: Electron-based desktop companion
- **Enterprise Features**: SSO, admin controls, compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: For powering our AI features
- **Supabase**: For backend infrastructure
- **Chrome Team**: For excellent extension APIs
- **Lucide**: For beautiful icons
- **Community**: For feedback and contributions
- **Knowledge Workers**: For inspiring better tools

---

<div align="center>
  <p>Made with ❤️ for better knowledge management</p>
  <p>
    <a href="https://github.com/yourusername/nest-extension">GitHub</a> •
    <a href="https://chrome.google.com/webstore/">Chrome Store</a> •
    <a href="mailto:support@nest-extension.com">Support</a> •
    <a href="https://nest-extension.com">Website</a>
  </p>
</div> 