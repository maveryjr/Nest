import React, { useState, useEffect } from 'react';
import { duplicateDetector, DuplicateCandidate, MergeAction } from '../../utils/duplicateDetector';
import { storage } from '../../utils/storage';
import { SavedLink } from '../../types';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete: (mergedCount: number) => void;
}

interface LinkPreview {
  id: string;
  title: string;
  url: string;
  domain: string;
  createdAt: string;
  userNote?: string;
  aiSummary?: string;
  highlights: number;
  tags: string[];
}

export const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose, onMergeComplete }) => {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [mergeActions, setMergeActions] = useState<MergeAction[]>([]);
  const [linkPreviews, setLinkPreviews] = useState<Map<string, LinkPreview>>(new Map());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [mergeResults, setMergeResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [currentStep, setCurrentStep] = useState<'scan' | 'review' | 'results'>('scan');

  useEffect(() => {
    if (isOpen) {
      findDuplicates();
    } else {
      // Reset state when modal closes
      setCurrentStep('scan');
      setDuplicates([]);
      setMergeActions([]);
      setLinkPreviews(new Map());
      setSelectedCandidates(new Set());
      setMergeResults({ success: 0, failed: 0 });
    }
  }, [isOpen]);

  const findDuplicates = async () => {
    setLoading(true);
    try {
      const candidates = await duplicateDetector.findDuplicates();
      setDuplicates(candidates);

      if (candidates.length > 0) {
        // Pre-select high-confidence duplicates
        const autoMergeable = new Set(
          candidates
            .filter(c => c.mergeRecommendation === 'auto')
            .map(c => `${c.originalId}_${c.duplicateId}`)
        );
        setSelectedCandidates(autoMergeable);

        // Load link previews
        await loadLinkPreviews(candidates);
        
        // Generate merge actions
        const actions = await duplicateDetector.suggestMergeStrategy(candidates);
        setMergeActions(actions);
        
        setCurrentStep('review');
      } else {
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Failed to find duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLinkPreviews = async (candidates: DuplicateCandidate[]) => {
    try {
      const uniqueLinkIds = new Set<string>();
      candidates.forEach(c => {
        uniqueLinkIds.add(c.originalId);
        uniqueLinkIds.add(c.duplicateId);
      });

      const data = await storage.getData();
      const previewMap = new Map<string, LinkPreview>();

      for (const linkId of uniqueLinkIds) {
        const link = data.links.find(l => l.id === linkId);
        if (link) {
          const tags = await storage.getLinkTags(linkId);
          const preview: LinkPreview = {
            id: link.id,
            title: link.title,
            url: link.url,
            domain: link.domain,
            createdAt: new Date(link.createdAt).toLocaleDateString(),
            userNote: link.userNote,
            aiSummary: link.aiSummary,
            highlights: link.highlights?.length || 0,
            tags: tags.map(t => t.name)
          };
          previewMap.set(linkId, preview);
        }
      }

      setLinkPreviews(previewMap);
    } catch (error) {
      console.error('Failed to load link previews:', error);
    }
  };

  const toggleCandidateSelection = (originalId: string, duplicateId: string) => {
    const key = `${originalId}_${duplicateId}`;
    const newSelected = new Set(selectedCandidates);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedCandidates(newSelected);
  };

  const executeMerges = async () => {
    setProcessing(true);
    setCurrentStep('results');
    
    let successCount = 0;
    let failedCount = 0;

    try {
      const selectedActions = mergeActions.filter(action => 
        selectedCandidates.has(`${action.primaryLinkId}_${action.duplicateLinkId}`) ||
        selectedCandidates.has(`${action.duplicateLinkId}_${action.primaryLinkId}`)
      );

      for (const action of selectedActions) {
        try {
          const result = await duplicateDetector.executeMerge(action);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error('Failed to execute merge:', error);
          failedCount++;
        }
      }

      setMergeResults({ success: successCount, failed: failedCount });
      onMergeComplete(successCount);
    } catch (error) {
      console.error('Failed to execute merges:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityColor = (recommendation: string) => {
    switch (recommendation) {
      case 'auto': return 'text-green-600 bg-green-100';
      case 'manual': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderLinkPreview = (linkId: string, isSecondary = false) => {
    const preview = linkPreviews.get(linkId);
    if (!preview) return null;

    return (
      <div className={`p-3 rounded-lg border ${isSecondary ? 'bg-gray-50' : 'bg-white'}`}>
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm text-gray-900 flex-1 pr-2">
            {preview.title}
          </h4>
          {isSecondary && (
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
              Duplicate
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-600 mb-2">
          <div className="truncate mb-1">{preview.url}</div>
          <div className="flex items-center gap-3">
            <span>{preview.domain}</span>
            <span>•</span>
            <span>{preview.createdAt}</span>
            {preview.highlights > 0 && (
              <>
                <span>•</span>
                <span>{preview.highlights} highlights</span>
              </>
            )}
          </div>
        </div>

        {preview.tags.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {preview.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
              {preview.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{preview.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {preview.userNote && (
          <div className="text-xs text-gray-700 bg-blue-50 p-2 rounded mb-2">
            <strong>Note:</strong> {preview.userNote.substring(0, 100)}
            {preview.userNote.length > 100 && '...'}
          </div>
        )}

        {preview.aiSummary && (
          <div className="text-xs text-gray-600">
            <strong>Summary:</strong> {preview.aiSummary.substring(0, 120)}
            {preview.aiSummary.length > 120 && '...'}
          </div>
        )}
      </div>
    );
  };

  const renderScanStep = () => (
    <div className="text-center py-8">
      <div className="mb-4">
        <svg className="w-16 h-16 mx-auto text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Scanning for Duplicates
      </h3>
      <p className="text-gray-600">
        Analyzing your saved links for potential duplicates...
      </p>
    </div>
  );

  const renderReviewStep = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Duplicate Review
        </h3>
        <p className="text-gray-600 mb-4">
          Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}. 
          Review and select which ones to merge.
        </p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 rounded"></div>
            <span className="text-green-700">Auto-merge recommended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 rounded"></div>
            <span className="text-yellow-700">Manual review</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
        {duplicates.map((candidate, index) => {
          const isSelected = selectedCandidates.has(`${candidate.originalId}_${candidate.duplicateId}`);
          const mergeAction = mergeActions.find(a => 
            (a.primaryLinkId === candidate.originalId && a.duplicateLinkId === candidate.duplicateId) ||
            (a.primaryLinkId === candidate.duplicateId && a.duplicateLinkId === candidate.originalId)
          );

          return (
            <div key={`${candidate.originalId}_${candidate.duplicateId}`} 
                 className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                                     <input
                     type="checkbox"
                     checked={isSelected}
                     onChange={() => toggleCandidateSelection(candidate.originalId, candidate.duplicateId)}
                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     aria-label={`Select duplicate pair for merging`}
                   />
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(candidate.mergeRecommendation)}`}>
                      {candidate.mergeRecommendation}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getConfidenceColor(candidate.confidence)}`}
                          style={{ width: `${candidate.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(candidate.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {Math.round(candidate.similarity * 100)}% similar
                  </div>
                  <div className="text-xs text-gray-500">
                    {candidate.similarityReasons.join(', ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderLinkPreview(candidate.originalId)}
                {renderLinkPreview(candidate.duplicateId, true)}
              </div>

              {mergeAction && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">
                    <strong>Merge Strategy:</strong> {mergeAction.reasoning}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedCandidates.size} of {duplicates.length} selected for merging
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedCandidates(new Set())}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear All
          </button>
          <button
            onClick={() => setSelectedCandidates(new Set(
              duplicates
                .filter(c => c.mergeRecommendation === 'auto')
                .map(c => `${c.originalId}_${c.duplicateId}`)
            ))}
            className="px-4 py-2 text-sm text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            Select Auto
          </button>
          <button
            onClick={executeMerges}
            disabled={selectedCandidates.size === 0 || processing}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Merging...' : `Merge ${selectedCandidates.size} Items`}
          </button>
        </div>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="text-center py-8">
      {duplicates.length === 0 ? (
        <>
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Duplicates Found
          </h3>
          <p className="text-gray-600 mb-6">
            Your library is clean! No duplicate links were detected.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4">
            {mergeResults.success > 0 ? (
              <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Merge Complete
          </h3>
          <div className="text-gray-600 mb-6 space-y-1">
            {mergeResults.success > 0 && (
              <p className="text-green-700">
                Successfully merged {mergeResults.success} duplicate{mergeResults.success !== 1 ? 's' : ''}
              </p>
            )}
            {mergeResults.failed > 0 && (
              <p className="text-red-700">
                Failed to merge {mergeResults.failed} item{mergeResults.failed !== 1 ? 's' : ''}
              </p>
            )}
            {mergeResults.success === 0 && mergeResults.failed === 0 && (
              <p>No merges were performed</p>
            )}
          </div>
        </>
      )}
      
      <div className="flex gap-3 justify-center">
        {duplicates.length > 0 && mergeResults.success + mergeResults.failed < duplicates.length && (
          <button
            onClick={() => setCurrentStep('review')}
            className="px-4 py-2 text-sm text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            Review Remaining
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Duplicate Manager
            </h2>
            <p className="text-sm text-gray-600">
              Find and merge duplicate links to clean up your library
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {loading || currentStep === 'scan' ? renderScanStep() :
           currentStep === 'review' ? renderReviewStep() :
           renderResultsStep()}
        </div>
      </div>
    </div>
  );
}; 