# Nest - Smart Bookmarking Chrome Extension

Nest is a powerful Chrome extension that transforms how you save and organize web content. It combines intelligent bookmarking with AI-powered summaries and flexible organization tools, all accessible through a beautiful sidebar interface.

## ✨ Features

### Core Functionality
- **Smart Link Capture**: Save any webpage with one click or right-click context menu
- **AI-Powered Summaries**: Automatically generates intelligent summaries of saved content
- **Holding Area**: Temporary storage for quick saves before organizing
- **Collections**: Create custom folders to organize your saved links
- **Auto-Categorization**: Intelligent category suggestions based on content and domain
- **Search & Filter**: Full-text search across titles, notes, summaries, and categories

### User Experience
- **Sidebar Interface**: Persistent, collapsible sidebar with modern design
- **Quick Notes**: Add personal notes to any saved link
- **Visual Favicons**: Automatic favicon detection with fallback placeholders
- **Keyboard Shortcuts**: Save pages instantly with `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
- **Context Menu**: Right-click to save any page or link
- **Mobile-Responsive**: Works beautifully on any screen size

### Data Management
- **Local Storage**: Uses IndexedDB for fast, offline access
- **Data Persistence**: All your data stays on your device
- **Export Ready**: Easy to extend for cloud sync or export features

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Chrome browser

### Development Setup

1. **Clone and install dependencies**:
```bash
git clone <your-repo-url>
cd nest-chrome-extension
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

4. **Test the extension**:
   - Click the Nest icon in the toolbar
   - Try saving a webpage
   - Open the sidebar to view your saved links

## 🔧 Development

### Project Structure
```
src/
├── background/          # Service worker scripts
├── content/            # Content script for page interaction
├── popup/              # Extension popup interface
├── sidepanel/          # Main sidebar application
│   ├── components/     # React components
│   └── sidepanel.css   # Styles
├── types/              # TypeScript type definitions
└── utils/              # Shared utilities
    ├── storage.ts      # IndexedDB storage manager
    └── ai.ts           # AI summary generation
```

### Key Components

- **Background Script**: Handles extension lifecycle, context menus, and page saving
- **Content Script**: Extracts page content for AI summarization
- **Sidepanel**: Main React application with full bookmark management
- **Popup**: Quick actions interface for saving and accessing sidebar
- **Storage Manager**: IndexedDB wrapper for data persistence
- **AI Service**: Intelligent summary generation (with OpenAI API placeholder)

### Available Scripts

```bash
npm run dev          # Development build with watch mode
npm run build        # Production build
npm run clean        # Clean build directory
```

## 🎯 Usage

### Saving Links
1. **Browser Action**: Click the Nest icon and select "Save to Nest"
2. **Context Menu**: Right-click any page and select "Save to Nest"
3. **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)

### Organization
1. **Holding Area**: All saved links start here
2. **Add Notes**: Click the edit icon to add personal notes
3. **Create Collections**: Organize links into custom folders
4. **Move Links**: Drag or use the menu to move links between collections
5. **Search**: Use the search bar to find links by any content

### Sidebar Navigation
- **Collapsible Sections**: Click headers to expand/collapse areas
- **Link Actions**: Hover over links for quick actions menu
- **Collection Management**: Create, rename, and manage collections
- **Search & Filter**: Real-time search across all saved content

## 🔮 AI Integration

The extension includes a placeholder AI service that can be configured with OpenAI API:

1. **Configure API Key**: Add your OpenAI API key in settings (future feature)
2. **Auto-Summarization**: Pages are automatically summarized when saved
3. **Fallback Logic**: Provides rule-based summaries when AI is unavailable

### Customizing AI Behavior

Edit `src/utils/ai.ts` to:
- Configure different AI models
- Adjust summary length and style
- Add custom prompts for different content types
- Implement alternative AI providers

## 🎨 Customization

### Styling
- Main styles in `src/sidepanel/sidepanel.css`
- Uses modern CSS with clean, minimal design
- Color scheme based on Tailwind CSS palette
- Fully customizable theme variables

### Adding Features
The codebase is designed for easy extension:
- Add new storage methods in `storage.ts`
- Create new React components in `components/`
- Extend the background script for new functionality
- Add new context menu items or keyboard shortcuts

## 🚧 Future Enhancements

- **Cloud Sync**: Sync bookmarks across devices
- **Tags System**: Add multiple tags to links
- **Import/Export**: Backup and restore functionality
- **Advanced Search**: Filters, date ranges, and sorting
- **Collaborative Collections**: Share collections with others
- **Web Clipper**: Save selected text and images
- **Analytics**: Usage insights and link management stats

## 🐛 Troubleshooting

### Common Issues

**Extension not loading**:
- Check that you've run `npm run build`
- Verify the `dist` folder exists and contains files
- Try reloading the extension in Chrome

**Save function not working**:
- Check browser console for errors
- Verify you're not on a `chrome://` page
- Try refreshing the target page

**Sidebar not opening**:
- Ensure you've clicked the extension icon
- Check that sidepanel permission is granted
- Try disabling and re-enabling the extension

**Development setup issues**:
- Verify Node.js version (16+)
- Clear `node_modules` and reinstall
- Check for TypeScript compilation errors

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Guidelines
- Follow the existing code style
- Add TypeScript types for new features
- Test thoroughly before submitting
- Update documentation for new features

---

**Built with ❤️ using React, TypeScript, and modern web technologies.** 