import React from 'react';
import { X } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  usageCount: number;
}

interface TagFiltersProps {
  tags: Tag[];
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  loading?: boolean;
}

const TagFilters: React.FC<TagFiltersProps> = ({
  tags,
  selectedTag,
  onTagSelect,
  loading = false
}) => {
  const getTagColor = (tagName: string): string => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="tag-filters">
        <div className="tag-filter-skeleton">Loading tags...</div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="tag-filters">
      {/* Clear filter button when a tag is selected */}
      {selectedTag && (
        <button
          onClick={() => onTagSelect(null)}
          className="tag-filter active"
          title="Clear tag filter"
        >
          <span 
            className="tag-filter-color"
            style={{ backgroundColor: getTagColor(selectedTag) }}
          />
          {selectedTag}
          <X size={12} />
        </button>
      )}

      {/* Available tag filters */}
      {tags
        .filter(tag => tag.name !== selectedTag) // Don't show already selected tag
        .sort((a, b) => b.usageCount - a.usageCount) // Sort by usage count
        .slice(0, 10) // Limit to top 10 tags
        .map((tag) => (
          <button
            key={tag.id}
            onClick={() => onTagSelect(tag.name)}
            className="tag-filter"
            title={`Filter by ${tag.name} tag`}
          >
            <span 
              className="tag-filter-color"
              style={{ backgroundColor: getTagColor(tag.name) }}
            />
            {tag.name}
            <span className="tag-filter-count">{tag.usageCount}</span>
          </button>
        ))}
      
      {tags.length > 10 && !selectedTag && (
        <span className="tag-filter-more">
          +{tags.length - 10} more
        </span>
      )}
    </div>
  );
};

export default TagFilters; 