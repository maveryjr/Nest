import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  ExternalLink, 
  Plus, 
  FolderPlus, 
  Archive,
  Tag,
  Bookmark,
  ArrowRight,
  Command as CommandIcon
} from 'lucide-react';
import { SavedLink, Collection } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  links: SavedLink[];
  collections: Collection[];
  onOpenLink: (url: string) => void;
  onAddToCollection: (linkId: string, collectionId: string) => void;
  onCreateCollection: () => void;
  onSaveCurrentPage: () => void;
  onAddNote: (link: SavedLink) => void;
  onOpenTabSync: () => void;
}

interface CommandItem {
  id: string;
  type: 'link' | 'action' | 'collection';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  link?: SavedLink;
  collection?: Collection;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  links,
  collections,
  onOpenLink,
  onAddToCollection,
  onCreateCollection,
  onSaveCurrentPage,
  onAddNote,
  onOpenTabSync
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate commands based on links, collections, and actions
  const generateCommands = useCallback((searchQuery: string) => {
    const allCommands: CommandItem[] = [];

    // Add quick actions
    allCommands.push({
      id: 'save-current',
      type: 'action',
      title: 'Save Current Page',
      subtitle: 'Add the current browser tab to Nest',
      icon: <Plus size={16} />,
      action: () => {
        onSaveCurrentPage();
        onClose();
      },
      keywords: ['save', 'add', 'current', 'page', 'bookmark']
    });

         allCommands.push({
       id: 'create-collection',
       type: 'action',
       title: 'Create New Collection',
       subtitle: 'Organize your links into collections',
       icon: <FolderPlus size={16} />,
       action: () => {
         onCreateCollection();
         onClose();
       },
       keywords: ['create', 'collection', 'folder', 'organize']
     });

     allCommands.push({
       id: 'tab-sync',
       type: 'action',
       title: 'Tab Sync Mode',
       subtitle: 'View and save open browser tabs',
       icon: <Bookmark size={16} />,
       action: () => {
         onOpenTabSync();
         onClose();
       },
       keywords: ['tab', 'sync', 'browser', 'open', 'tabs', 'save']
     });

    // Add collections
    collections.forEach(collection => {
      allCommands.push({
        id: `collection-${collection.id}`,
        type: 'collection',
        title: collection.name,
        subtitle: `Collection • ${links.filter(l => l.collectionId === collection.id).length} links`,
        icon: <Archive size={16} />,
        action: () => {
          // Could navigate to collection view
          onClose();
        },
        keywords: ['collection', collection.name.toLowerCase(), collection.description?.toLowerCase()],
        collection
      });
    });

    // Add links with fuzzy search
    const filteredLinks = searchQuery.trim() 
      ? fuzzySearchLinks(links, searchQuery)
      : links.slice(0, 10); // Show recent links if no query

    filteredLinks.forEach(link => {
      allCommands.push({
        id: `link-${link.id}`,
        type: 'link',
        title: link.title,
        subtitle: `${link.domain} • ${link.userNote ? 'Has note' : 'No note'}`,
        icon: <ExternalLink size={16} />,
        action: () => {
          onOpenLink(link.url);
          onClose();
        },
        keywords: [
          link.title.toLowerCase(),
          link.domain.toLowerCase(),
          link.userNote.toLowerCase(),
          link.aiSummary?.toLowerCase() || '',
          link.category.toLowerCase()
        ],
        link
      });
    });

    // Filter commands based on search query
    if (searchQuery.trim()) {
      return allCommands.filter(command => 
        command.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        command.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        command.keywords?.some(keyword => 
          keyword.includes(searchQuery.toLowerCase())
        )
      );
    }

         return allCommands.slice(0, 12); // Limit results
   }, [links, collections, onOpenLink, onAddToCollection, onCreateCollection, onSaveCurrentPage, onAddNote, onOpenTabSync, onClose]);

  // Fuzzy search implementation for links
  const fuzzySearchLinks = (linkList: SavedLink[], searchQuery: string): SavedLink[] => {
    const query = searchQuery.toLowerCase();
    const scored = linkList.map(link => {
      let score = 0;
      const title = link.title.toLowerCase();
      const domain = link.domain.toLowerCase();
      const note = link.userNote.toLowerCase();
      const summary = link.aiSummary?.toLowerCase() || '';

      // Exact matches get highest score
      if (title.includes(query)) score += 10;
      if (domain.includes(query)) score += 5;
      if (note.includes(query)) score += 8;
      if (summary.includes(query)) score += 6;

      // Fuzzy matching for title (character proximity)
      const fuzzyScore = calculateFuzzyScore(title, query);
      score += fuzzyScore;

      return { link, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ link }) => link);
  };

  // Simple fuzzy scoring algorithm
  const calculateFuzzyScore = (text: string, query: string): number => {
    let score = 0;
    let textIndex = 0;
    
    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      const foundIndex = text.indexOf(char, textIndex);
      
      if (foundIndex === -1) return 0;
      
      // Closer characters get higher scores
      const distance = foundIndex - textIndex;
      score += Math.max(0, 10 - distance);
      textIndex = foundIndex + 1;
    }
    
    return score;
  };

  // Update commands when query changes
  useEffect(() => {
    const newCommands = generateCommands(query);
    setCommands(newCommands);
    setSelectedIndex(0);
  }, [query, generateCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (commands[selectedIndex]) {
            commands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands, selectedIndex, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && commands.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, commands]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <div className="command-palette-search">
            <Search size={18} className="command-palette-search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search links, collections, or commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="command-palette-input"
            />
          </div>
        </div>

        <div className="command-palette-content" ref={listRef}>
          {commands.length === 0 ? (
            <div className="command-palette-empty">
              <p>No results found</p>
            </div>
          ) : (
            commands.map((command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => command.action()}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-palette-item-icon">
                  {command.icon}
                </div>
                <div className="command-palette-item-content">
                  <div className="command-palette-item-title">
                    {command.title}
                  </div>
                  {command.subtitle && (
                    <div className="command-palette-item-subtitle">
                      {command.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-tips">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette; 