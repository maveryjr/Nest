import React, { useState, useEffect } from 'react';
import { 
  Focus, 
  Timer, 
  Clock, 
  Target, 
  Play, 
  Pause, 
  Square, 
  Settings as SettingsIcon,
  Shield,
  Eye,
  BookOpen,
  X
} from 'lucide-react';
import { FocusMode, ReadingGoal } from '../../types';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
}

const FocusModeComponent: React.FC<FocusModeProps> = ({ isOpen, onClose }) => {
  const [focusMode, setFocusMode] = useState<FocusMode | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedType, setSelectedType] = useState<'reading' | 'research' | 'distraction-free'>('reading');
  const [duration, setDuration] = useState(25); // Default 25 minutes
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  // Load saved focus mode settings
  useEffect(() => {
    loadFocusMode();
  }, []);

  const loadFocusMode = async () => {
    try {
      const result = await chrome.storage.local.get('nest_focus_mode');
      if (result.nest_focus_mode) {
        const savedMode = result.nest_focus_mode;
        setFocusMode(savedMode);
        if (savedMode.enabled) {
          setIsActive(true);
          setSelectedType(savedMode.type);
          const elapsed = Date.now() - savedMode.startTime.getTime();
          const remaining = Math.max(0, (savedMode.plannedDuration * 60 * 1000) - elapsed);
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      }
    } catch (error) {
      console.error('Failed to load focus mode:', error);
    }
  };

  const saveFocusMode = async (mode: FocusMode) => {
    try {
      await chrome.storage.local.set({ 'nest_focus_mode': mode });
      setFocusMode(mode);
    } catch (error) {
      console.error('Failed to save focus mode:', error);
    }
  };

  const startFocusSession = async () => {
    const newFocusMode: FocusMode = {
      enabled: true,
      type: selectedType,
      startTime: new Date(),
      plannedDuration: duration,
      blockedSites: blockedSites,
      allowedSites: [],
      goals: goals,
      customSettings: {}
    };

    await saveFocusMode(newFocusMode);
    setTimeRemaining(duration * 60);
    setIsActive(true);

    // Send message to background to enable site blocking
    chrome.runtime.sendMessage({
      action: 'enableFocusMode',
      focusMode: newFocusMode
    });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🎯 Focus Mode Started',
      message: `${duration} minute ${selectedType} session started`
    });
  };

  const pauseFocusSession = async () => {
    setIsActive(false);
    if (focusMode) {
      const updatedMode = { ...focusMode, enabled: false };
      await saveFocusMode(updatedMode);
    }
  };

  const resumeFocusSession = async () => {
    setIsActive(true);
    if (focusMode) {
      const updatedMode = { ...focusMode, enabled: true };
      await saveFocusMode(updatedMode);
    }
  };

  const stopFocusSession = async () => {
    setIsActive(false);
    setTimeRemaining(0);
    
    if (focusMode) {
      const updatedMode = { ...focusMode, enabled: false };
      await saveFocusMode(updatedMode);
    }

    // Send message to background to disable site blocking
    chrome.runtime.sendMessage({
      action: 'disableFocusMode'
    });

    // Show completion notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '✅ Focus Session Complete',
      message: 'Great job staying focused!'
    });
  };

  const handleSessionComplete = async () => {
    await stopFocusSession();
    
    // Show celebration notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🎉 Focus Session Complete!',
      message: `You successfully completed a ${duration} minute ${selectedType} session!`
    });
  };

  const addGoal = () => {
    if (newGoal.trim() && !goals.includes(newGoal.trim())) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    setGoals(goals.filter(g => g !== goal));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFocusTypeConfig = (type: string) => {
    switch (type) {
      case 'reading':
        return {
          icon: <BookOpen size={20} />,
          color: '#3b82f6',
          description: 'Deep reading with minimal distractions',
          defaultSites: ['social media', 'news', 'shopping']
        };
      case 'research':
        return {
          icon: <Target size={20} />,
          color: '#10b981',
          description: 'Focused research with academic tools',
          defaultSites: ['entertainment', 'social media', 'games']
        };
      case 'distraction-free':
        return {
          icon: <Shield size={20} />,
          color: '#8b5cf6',
          description: 'Complete focus with all distractions blocked',
          defaultSites: ['all non-essential sites']
        };
      default:
        return {
          icon: <Focus size={20} />,
          color: '#6b7280',
          description: 'General focus mode',
          defaultSites: []
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content focus-mode-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Focus size={24} />
            Focus Mode
          </h2>
          <button onClick={onClose} className="modal-close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {isActive ? (
            // Active session view
            <div className="focus-session-active">
              <div className="focus-timer">
                <div className="timer-display">
                  <Timer size={48} />
                  <div className="time-remaining">{formatTime(timeRemaining)}</div>
                </div>
                
                <div className="session-info">
                  <div className="session-type">
                    {getFocusTypeConfig(selectedType).icon}
                    <span>{selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Session</span>
                  </div>
                  {goals.length > 0 && (
                    <div className="session-goals">
                      <h4>Session Goals:</h4>
                      <ul>
                        {goals.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="focus-controls">
                <button
                  onClick={isActive ? pauseFocusSession : resumeFocusSession}
                  className="control-button primary"
                >
                  {isActive ? <Pause size={16} /> : <Play size={16} />}
                  {isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={stopFocusSession}
                  className="control-button secondary"
                >
                  <Square size={16} />
                  Stop Session
                </button>
              </div>
            </div>
          ) : (
            // Setup view
            <div className="focus-setup">
              {!showSettings ? (
                <>
                  <div className="focus-type-selection">
                    <h3>Choose Focus Type</h3>
                    <div className="focus-types">
                      {(['reading', 'research', 'distraction-free'] as const).map((type) => {
                        const config = getFocusTypeConfig(type);
                        return (
                          <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`focus-type-card ${selectedType === type ? 'selected' : ''}`}
                            style={{ borderColor: selectedType === type ? config.color : undefined }}
                          >
                            <div className="focus-type-icon" style={{ color: config.color }}>
                              {config.icon}
                            </div>
                            <div className="focus-type-info">
                              <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                              <p>{config.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="duration-selection">
                    <h3>Session Duration</h3>
                    <div className="duration-options">
                      {[15, 25, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setDuration(mins)}
                          className={`duration-option ${duration === mins ? 'selected' : ''}`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                    <div className="custom-duration">
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 25)}
                        min="5"
                        max="180"
                        className="duration-input"
                      />
                      <span>minutes</span>
                    </div>
                  </div>

                  <div className="session-goals">
                    <h3>Session Goals (Optional)</h3>
                    <div className="goal-input">
                      <input
                        type="text"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                        placeholder="Add a goal for this session..."
                        className="goal-input-field"
                      />
                                             <button 
                         onClick={addGoal} 
                         className="add-goal-button"
                         title="Add goal to session"
                       >
                        Add
                      </button>
                    </div>
                    {goals.length > 0 && (
                      <div className="goals-list">
                        {goals.map((goal, index) => (
                          <div key={index} className="goal-item">
                            <span>{goal}</span>
                            <button 
                              onClick={() => removeGoal(goal)} 
                              className="remove-goal"
                              title={`Remove goal: ${goal}`}
                              aria-label={`Remove goal: ${goal}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="focus-actions">
                    <button onClick={startFocusSession} className="start-focus-button">
                      <Play size={16} />
                      Start Focus Session
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="settings-button secondary"
                    >
                      <SettingsIcon size={16} />
                      Advanced Settings
                    </button>
                  </div>
                </>
              ) : (
                // Advanced settings view
                <div className="focus-settings">
                  <div className="settings-header">
                    <h3>Advanced Settings</h3>
                                         <button
                       onClick={() => setShowSettings(false)}
                       className="back-button"
                       title="Go back to main settings"
                     >
                       Back
                     </button>
                  </div>
                  
                  <div className="blocked-sites-section">
                    <h4>Blocked Sites</h4>
                    <p>Sites that will be blocked during focus sessions</p>
                    <div className="blocked-sites-list">
                      {['facebook.com', 'twitter.com', 'youtube.com', 'reddit.com', 'tiktok.com'].map((site) => (
                        <label key={site} className="site-checkbox">
                          <input
                            type="checkbox"
                            checked={blockedSites.includes(site)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBlockedSites([...blockedSites, site]);
                              } else {
                                setBlockedSites(blockedSites.filter(s => s !== site));
                              }
                            }}
                          />
                          <span>{site}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusModeComponent; 