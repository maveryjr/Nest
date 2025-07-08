import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  X, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Settings as SettingsIcon,
  Link as LinkIcon,
  Lightbulb,
  Tag,
  FileText
} from 'lucide-react';
import { KnowledgeGraphNode, KnowledgeGraphConnection, SavedLink } from '../../types';

interface KnowledgeGraphProps {
  isOpen: boolean;
  onClose: () => void;
  links: SavedLink[];
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ isOpen, onClose, links }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [connections, setConnections] = useState<KnowledgeGraphConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState({
    showLinks: true,
    showHighlights: true,
    showNotes: true,
    showTags: true,
    minConnectionStrength: 0.3
  });

  useEffect(() => {
    if (isOpen) {
      generateGraph();
    }
  }, [isOpen, links]);

  useEffect(() => {
    if (isOpen) {
      drawGraph();
    }
  }, [nodes, connections, zoom, pan, filter]);

  const generateGraph = async () => {
    const graphNodes: KnowledgeGraphNode[] = [];
    const graphConnections: KnowledgeGraphConnection[] = [];

    // Create nodes for links
    links.forEach((link, index) => {
      if (filter.showLinks) {
        graphNodes.push({
          id: `link-${link.id}`,
          type: 'link',
          title: link.title,
          content: link.aiSummary || link.userNote || '',
          url: link.url,
          position: { 
            x: Math.cos(index * 0.5) * 200 + 300, 
            y: Math.sin(index * 0.5) * 200 + 300 
          },
          connections: [],
          metadata: {
            domain: link.domain,
            tags: link.tags || [],
            createdAt: link.createdAt
          }
        });
      }

      // Create nodes for highlights
      if (filter.showHighlights && link.highlights) {
        link.highlights.forEach((highlight, hIndex) => {
          graphNodes.push({
            id: `highlight-${highlight.id}`,
            type: 'highlight',
            title: highlight.selectedText.substring(0, 50) + '...',
            content: highlight.selectedText,
            position: { 
              x: Math.cos((index + hIndex) * 0.7) * 150 + 300, 
              y: Math.sin((index + hIndex) * 0.7) * 150 + 300 
            },
            connections: [],
            metadata: {
              linkId: link.id,
              context: highlight.context
            }
          });

          // Connect highlight to its parent link
          graphConnections.push({
            id: `highlight-link-${highlight.id}`,
            sourceId: `highlight-${highlight.id}`,
            targetId: `link-${link.id}`,
            type: 'cites',
            strength: 1.0,
            userCreated: false,
            createdAt: new Date()
          });
        });
      }
    });

    // Generate AI-powered connections between nodes
    for (let i = 0; i < graphNodes.length; i++) {
      for (let j = i + 1; j < graphNodes.length; j++) {
        const node1 = graphNodes[i];
        const node2 = graphNodes[j];
        
        const connectionStrength = calculateConnectionStrength(node1, node2);
        
        if (connectionStrength >= filter.minConnectionStrength) {
          graphConnections.push({
            id: `auto-${node1.id}-${node2.id}`,
            sourceId: node1.id,
            targetId: node2.id,
            type: 'relates',
            strength: connectionStrength,
            userCreated: false,
            createdAt: new Date()
          });
        }
      }
    }

    // Create tag nodes if enabled
    if (filter.showTags) {
      const allTags = new Set<string>();
      links.forEach(link => {
        (link.tags || []).forEach(tag => allTags.add(tag));
      });

      Array.from(allTags).forEach((tag, index) => {
        graphNodes.push({
          id: `tag-${tag}`,
          type: 'tag',
          title: tag,
          content: `Tag: ${tag}`,
          position: { 
            x: Math.cos(index * 1.2) * 100 + 300, 
            y: Math.sin(index * 1.2) * 100 + 300 
          },
          connections: [],
          metadata: { name: tag }
        });

        // Connect tags to links
        links.forEach(link => {
          if ((link.tags || []).includes(tag)) {
            graphConnections.push({
              id: `tag-link-${tag}-${link.id}`,
              sourceId: `tag-${tag}`,
              targetId: `link-${link.id}`,
              type: 'relates',
              strength: 0.8,
              userCreated: false,
              createdAt: new Date()
            });
          }
        });
      });
    }

    setNodes(graphNodes);
    setConnections(graphConnections);
  };

  const calculateConnectionStrength = (node1: KnowledgeGraphNode, node2: KnowledgeGraphNode): number => {
    let strength = 0;

    // Same domain bonus
    if (node1.metadata.domain && node2.metadata.domain && 
        node1.metadata.domain === node2.metadata.domain) {
      strength += 0.3;
    }

    // Shared tags bonus
    const tags1 = node1.metadata.tags || [];
    const tags2 = node2.metadata.tags || [];
    const sharedTags = tags1.filter((tag: string) => tags2.includes(tag));
    strength += sharedTags.length * 0.2;

    // Content similarity (simple keyword matching)
    const content1 = (node1.title + ' ' + node1.content).toLowerCase();
    const content2 = (node2.title + ' ' + node2.content).toLowerCase();
    const words1 = content1.split(/\s+/).filter(word => word.length > 3);
    const words2 = content2.split(/\s+/).filter(word => word.length > 3);
    const commonWords = words1.filter(word => words2.includes(word));
    strength += Math.min(commonWords.length * 0.1, 0.5);

    return Math.min(strength, 1.0);
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw connections
    connections.forEach(connection => {
      const sourceNode = nodes.find(n => n.id === connection.sourceId);
      const targetNode = nodes.find(n => n.id === connection.targetId);
      
      if (sourceNode && targetNode && connection.strength >= filter.minConnectionStrength) {
        drawConnection(ctx, sourceNode, targetNode, connection);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (shouldShowNode(node)) {
        drawNode(ctx, node, node.id === selectedNode?.id);
      }
    });

    ctx.restore();
  };

  const shouldShowNode = (node: KnowledgeGraphNode): boolean => {
    switch (node.type) {
      case 'link': return filter.showLinks;
      case 'highlight': return filter.showHighlights;
      case 'note': return filter.showNotes;
      case 'tag': return filter.showTags;
      default: return true;
    }
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: KnowledgeGraphNode, isSelected: boolean) => {
    const { x, y } = node.position;
    const radius = getNodeRadius(node);
    const color = getNodeColor(node);

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw node icon
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const icon = getNodeIcon(node);
    ctx.fillText(icon, x, y);

    // Draw node label
    if (zoom > 0.5) {
      ctx.fillStyle = '#333333';
      ctx.font = '10px Arial';
      ctx.fillText(node.title.substring(0, 20), x, y + radius + 15);
    }
  };

  const drawConnection = (
    ctx: CanvasRenderingContext2D, 
    source: KnowledgeGraphNode, 
    target: KnowledgeGraphNode, 
    connection: KnowledgeGraphConnection
  ) => {
    ctx.beginPath();
    ctx.moveTo(source.position.x, source.position.y);
    ctx.lineTo(target.position.x, target.position.y);
    
    ctx.strokeStyle = getConnectionColor(connection);
    ctx.lineWidth = Math.max(1, connection.strength * 3);
    ctx.globalAlpha = connection.strength;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const getNodeRadius = (node: KnowledgeGraphNode): number => {
    switch (node.type) {
      case 'link': return 20;
      case 'highlight': return 15;
      case 'note': return 18;
      case 'tag': return 12;
      default: return 15;
    }
  };

  const getNodeColor = (node: KnowledgeGraphNode): string => {
    switch (node.type) {
      case 'link': return '#3b82f6';
      case 'highlight': return '#10b981';
      case 'note': return '#f59e0b';
      case 'tag': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getNodeIcon = (node: KnowledgeGraphNode): string => {
    switch (node.type) {
      case 'link': return '🔗';
      case 'highlight': return '✨';
      case 'note': return '📝';
      case 'tag': return '🏷️';
      default: return '●';
    }
  };

  const getConnectionColor = (connection: KnowledgeGraphConnection): string => {
    switch (connection.type) {
      case 'relates': return '#94a3b8';
      case 'contradicts': return '#ef4444';
      case 'supports': return '#10b981';
      case 'cites': return '#3b82f6';
      case 'builds-on': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;

    // Find clicked node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(x - node.position.x, 2) + Math.pow(y - node.position.y, 2)
      );
      return distance <= getNodeRadius(node);
    });

    setSelectedNode(clickedNode || null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const newZoom = Math.max(0.1, Math.min(3, zoom + (event.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content knowledge-graph-modal ${isFullscreen ? 'fullscreen' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <Network size={24} />
            Knowledge Graph
          </h2>
          <div className="header-actions">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="action-button"
              title="Graph settings"
            >
              <SettingsIcon size={16} />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="action-button"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={generateGraph}
              className="action-button"
              title="Refresh graph"
            >
              <RotateCcw size={16} />
            </button>
            <button onClick={onClose} className="modal-close-button">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="knowledge-graph-body">
          {showSettings && (
            <div className="graph-settings">
              <h3>Graph Settings</h3>
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={filter.showLinks}
                    onChange={(e) => setFilter({...filter, showLinks: e.target.checked})}
                  />
                  <LinkIcon size={16} />
                  Show Links
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filter.showHighlights}
                    onChange={(e) => setFilter({...filter, showHighlights: e.target.checked})}
                  />
                  <Lightbulb size={16} />
                  Show Highlights
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filter.showTags}
                    onChange={(e) => setFilter({...filter, showTags: e.target.checked})}
                  />
                  <Tag size={16} />
                  Show Tags
                </label>
              </div>
              <div className="setting-group">
                <label>
                  Connection Strength: {filter.minConnectionStrength.toFixed(1)}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filter.minConnectionStrength}
                    onChange={(e) => setFilter({...filter, minConnectionStrength: parseFloat(e.target.value)})}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="graph-container">
            <canvas
              ref={canvasRef}
              width={isFullscreen ? window.innerWidth - 40 : 800}
              height={isFullscreen ? window.innerHeight - 120 : 600}
              onClick={handleCanvasClick}
              onWheel={handleWheel}
              className="knowledge-graph-canvas"
            />
            
            <div className="graph-controls">
              <button onClick={() => setZoom(zoom * 1.2)} title="Zoom in">+</button>
              <button onClick={() => setZoom(zoom * 0.8)} title="Zoom out">-</button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {selectedNode && (
            <div className="node-details">
              <h3>{selectedNode.title}</h3>
              <p className="node-type">{selectedNode.type.toUpperCase()}</p>
              <p className="node-content">{selectedNode.content}</p>
              {selectedNode.url && (
                <button
                  onClick={() => window.open(selectedNode.url, '_blank')}
                  className="open-link-button"
                >
                  <LinkIcon size={14} />
                  Open Link
                </button>
              )}
            </div>
          )}
        </div>

        <div className="graph-legend">
          <div className="legend-item">
            <div className="legend-node" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Links</span>
          </div>
          <div className="legend-item">
            <div className="legend-node" style={{ backgroundColor: '#10b981' }}></div>
            <span>Highlights</span>
          </div>
          <div className="legend-item">
            <div className="legend-node" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span>Tags</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph; 