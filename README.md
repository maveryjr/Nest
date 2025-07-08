# Nest - Smart Bookmarks & Notes

<div align="center">
  <img src="icons/icon128.png" alt="Nest Icon" width="128" height="128">
  
  **A smart bookmarking and note-taking Chrome extension with AI-powered features**
  
  [![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available%20Soon-green.svg)](https://chrome.google.com/webstore/)
  [![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)](manifest.json)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
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

### 🎯 Core Features
- **Smart Bookmarking**: Save web pages with automatic categorization and tagging
- **Inbox System**: Organized workflow for processing and categorizing saved content
- **Smart Collections**: AI-powered dynamic collections that auto-update based on content
- **Highlight & Annotate**: Save text highlights with customizable colors and personal notes
- **Advanced Search**: Full-text search across all your saved content
- **Tag Management**: Organize content with smart tags and auto-suggestions

### 🤖 AI-Powered Features
- **Floating AI Assistant**: Context-aware AI chat overlay for any webpage
- **Auto-Summarization**: Generate AI summaries for saved links
- **Smart Categorization**: Automatic content categorization using AI
- **Auto-Tagging**: Intelligent tag suggestions based on content analysis
- **Cross-References**: Find relationships between your saved content
- **Reading Analytics**: Track reading habits and get personalized insights

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with smooth animations
- **Dark Mode Ready**: CSS variables prepared for dark theme
- **Compact View**: Space-efficient layout for power users
- **Keyboard Navigation**: Complete keyboard shortcuts for efficiency
- **Mobile Responsive**: Works beautifully on all screen sizes
- **Accessibility**: WCAG compliant with screen reader support

### 🔧 Advanced Features
- **New Tab Integration**: Replace Chrome's new tab with your knowledge hub
- **Floating Window**: Raycast-like popup window for quick access
- **Tab Sync**: Save multiple tabs at once to collections
- **Export/Import**: Backup and restore your data
- **Focus Mode**: Distraction-free reading with site blocking
- **Knowledge Graph**: Visual exploration of content relationships

## 🚀 Installation

### Method 1: Chrome Web Store (Recommended)
*Coming Soon - Extension will be available on the Chrome Web Store*

### Method 2: Developer Installation

1. **Download or Clone**
   ```bash
   git clone https://github.com/yourusername/nest-extension.git
   cd nest-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder
   - The Nest extension should now appear in your extensions

5. **Initial Setup**
   - Click the Nest icon in your Chrome toolbar
   - Follow the setup wizard to configure your preferences
   - Optionally add your OpenAI API key for enhanced AI features

## 🎯 Quick Start

### Save Your First Link
1. Navigate to any webpage
2. Click the Nest icon or use `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)
3. Add tags, categories, or notes as desired
4. Click "Save to Nest"

### Access Your Saved Content
- **Sidepanel**: Click the Nest icon to open the sidepanel
- **New Tab**: Enable "Replace New Tab" in settings
- **Floating Window**: Use command palette or settings to open floating window

### Use the AI Assistant
1. Press `Alt+A` (or `Cmd+A` on Mac) on any webpage
2. The floating AI assistant will appear
3. Ask questions about the current page or get help with content
4. Use quick actions like "Summarize Page" or "Key Points"

## 📖 User Guide

### Inbox Workflow
The inbox is your central hub for processing new content:

1. **Save to Inbox**: New links automatically go to your inbox
2. **Process Items**: Review, categorize, and tag items in your inbox
3. **Move to Collections**: Organize processed items into specific collections
4. **AI Auto-Organize**: Let AI automatically categorize and move items

### Smart Collections
Smart Collections are dynamic groups that automatically update:

- **Recent Reads**: Recently accessed content
- **Unread Items**: Content you haven't opened yet
- **AI-Related**: Automatically tagged AI/ML content
- **Tutorials**: How-to guides and educational content
- **GitHub Repos**: Automatically detected code repositories

### Text Highlighting
1. **Select Text**: Highlight any text on a webpage
2. **Save Highlight**: Click the highlight button that appears
3. **Add Notes**: Optionally add personal notes to highlights
4. **Customize Colors**: Choose from 7 color options and 4 styles
5. **Access Later**: View all highlights in the sidepanel

### Collections Management
- **Create Collections**: Organize links by topic, project, or theme
- **Move Items**: Drag and drop or use the context menu
- **Share Collections**: Make collections public with shareable links
- **Collection Settings**: Configure visibility and collaboration options

### Search & Discovery
- **Quick Search**: Use the search bar in the sidepanel
- **Full-Text Search**: Search through content, titles, and notes
- **Filter by Tags**: Click tags to filter your content
- **Smart Suggestions**: Get AI-powered content recommendations

## 🤖 AI Features

### Floating AI Assistant
The floating AI assistant provides context-aware help on any webpage:

**Activation Methods:**
- Keyboard: `Alt+A` (Windows/Linux) or `Cmd+A` (Mac)
- Icon: Click the AI button in the sidepanel
- Command Palette: Search for "Toggle Floating AI"

**Quick Actions:**
- **Summarize Page**: Get a concise summary of the current page
- **Explain Simply**: Break down complex concepts
- **Key Points**: Extract main takeaways
- **Generate Questions**: Create questions for deeper understanding
- **Action Items**: Get actionable steps and recommendations
- **Research Topics**: Discover related topics to explore

### AI Configuration
1. **Get OpenAI API Key**: Visit [OpenAI Platform](https://platform.openai.com/)
2. **Add to Settings**: Go to Settings → Preferences → OpenAI API Key
3. **Enable Features**: Turn on auto-summarization, auto-tagging, etc.

**Note**: AI features work with fallback functionality even without an API key.

## ⌨️ Keyboard Shortcuts

### Global Shortcuts
- `Ctrl+Shift+S` / `Cmd+Shift+S`: Save current page
- `Ctrl+Shift+I` / `Cmd+Shift+I`: Save to inbox
- `Alt+A` / `Cmd+A`: Toggle floating AI assistant
- `Ctrl+K` / `Cmd+K`: Open command palette

### Sidepanel Navigation
- `Escape`: Close modals and panels
- `Tab` / `Shift+Tab`: Navigate between elements
- `Enter`: Activate buttons and links
- `Arrow Keys`: Navigate through lists

### Text Highlighting
- **Select text** + **Click highlight button**: Save highlight
- **Double-click highlight**: Edit highlight note
- **Right-click highlight**: Delete or modify highlight

## 🔒 Privacy & Security

### Data Storage
- **Local Storage**: All data is stored locally in Chrome's storage
- **Optional Cloud Sync**: Use Supabase for cross-device synchronization
- **No Tracking**: We don't track your browsing or collect analytics

### AI Processing
- **Content Analysis**: Page content may be sent to OpenAI for AI features
- **User Control**: All AI features can be disabled in settings
- **No Storage**: AI providers don't store your data permanently
- **Privacy First**: Sensitive content is processed locally when possible

### Permissions
- `storage`: Save your bookmarks and settings
- `activeTab`: Read page content for saving and AI features
- `contextMenus`: Add right-click menu options
- `tabs`: Manage tab operations and new tab replacement
- `sidePanel`: Display the extension sidepanel

## 🛠️ Development

### Project Structure
```
nest-extension/
├── src/
│   ├── background/       # Service worker and background scripts
│   ├── content/          # Content scripts for web page interaction
│   ├── sidepanel/        # Main sidepanel interface
│   ├── newtab/          # New tab page replacement
│   ├── popup/           # Extension popup (quick actions)
│   ├── utils/           # Shared utilities and services
│   └── types/           # TypeScript type definitions
├── icons/               # Extension icons
├── dist/               # Built extension files
└── manifest.json       # Extension manifest
```

### Technologies Used
- **Frontend**: React 18, TypeScript, Modern CSS
- **Build Tool**: Vite with Chrome Extension plugin
- **Backend**: Supabase (optional, for cloud sync)
- **AI**: OpenAI GPT API with local fallbacks
- **Storage**: Chrome Extension Storage API

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building Custom Features
1. **Add new components** in appropriate `src/` directories
2. **Update types** in `src/types/` for TypeScript support
3. **Add tests** for new functionality
4. **Update manifest** if adding new permissions
5. **Build and test** with `npm run build`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript and React best practices
- Add tests for new features
- Ensure accessibility compliance
- Update documentation for user-facing changes
- Test on multiple websites and scenarios

## 📞 Support

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/yourusername/nest-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/nest-extension/discussions)
- **Email**: support@nest-extension.com

### Known Issues
- Some websites with heavy JavaScript may not highlight properly
- AI features require internet connection
- Large collections may experience slower load times

### Troubleshooting

**Extension not working?**
- Check if developer mode is enabled
- Reload the extension in `chrome://extensions/`
- Check browser console for errors

**AI features not working?**
- Verify OpenAI API key in settings
- Check internet connection
- Ensure API key has sufficient credits

**Highlights not saving?**
- Try refreshing the page
- Check if the website blocks content modification
- Verify extension permissions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons from [Lucide Icons](https://lucide.dev/)
- UI inspiration from modern design systems
- Community feedback and contributions
- OpenAI for AI capabilities

---

<div align="center">
  <p>Made with ❤️ for better knowledge management</p>
  <p>
    <a href="https://github.com/yourusername/nest-extension">GitHub</a> •
    <a href="https://chrome.google.com/webstore/">Chrome Store</a> •
    <a href="mailto:support@nest-extension.com">Support</a>
  </p>
</div> 