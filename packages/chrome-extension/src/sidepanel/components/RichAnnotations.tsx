import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Save, 
  X, 
  Volume2, 
  Bold, 
  Italic, 
  Underline,
  Type,
  Palette
} from 'lucide-react';
import { VoiceMemo, RichNote, RichNoteFormatting } from '../../types';

interface RichAnnotationsProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVoiceMemo: (memo: VoiceMemo) => void;
  onSaveRichNote: (note: RichNote) => void;
  initialNote?: string;
  targetType: 'link' | 'highlight';
  targetId: string;
}

const RichAnnotations: React.FC<RichAnnotationsProps> = ({
  isOpen,
  onClose,
  onSaveVoiceMemo,
  onSaveRichNote,
  initialNote = '',
  targetType,
  targetId
}) => {
  // Voice memo state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDataURL, setAudioDataURL] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');

  // Rich text note state
  const [noteContent, setNoteContent] = useState(initialNote);
  const [formatting, setFormatting] = useState<RichNoteFormatting>({
    bold: false,
    italic: false,
    underline: false,
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: 14,
    fontFamily: 'Arial'
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setIsPlaying(false);
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        
        // Create audio data URL for playback
        const reader = new FileReader();
        reader.onload = () => {
          setAudioDataURL(reader.result as string);
        };
        reader.readAsDataURL(blob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioDataURL && audioRef.current) {
      audioRef.current.src = audioDataURL;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSaveVoiceMemo = async () => {
    if (!audioBlob) return;

    const voiceMemo: VoiceMemo = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      audioBlob,
      audioDataURL: audioDataURL || undefined,
      duration: recordingDuration,
      transcription: transcription || undefined,
      createdAt: new Date()
    };

    onSaveVoiceMemo(voiceMemo);
  };

  const handleSaveRichNote = () => {
    if (!noteContent.trim()) return;

    const richNote: RichNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: applyFormatting(noteContent),
      plainText: noteContent,
      formatting,
      lastEdited: new Date()
    };

    onSaveRichNote(richNote);
  };

  const applyFormatting = (text: string): string => {
    let formattedText = text;
    
    if (formatting.bold) formattedText = `<strong>${formattedText}</strong>`;
    if (formatting.italic) formattedText = `<em>${formattedText}</em>`;
    if (formatting.underline) formattedText = `<u>${formattedText}</u>`;
    
    const styles = [];
    if (formatting.color !== '#000000') styles.push(`color: ${formatting.color}`);
    if (formatting.backgroundColor !== '#ffffff') styles.push(`background-color: ${formatting.backgroundColor}`);
    if (formatting.fontSize !== 14) styles.push(`font-size: ${formatting.fontSize}px`);
    if (formatting.fontFamily !== 'Arial') styles.push(`font-family: ${formatting.fontFamily}`);
    
    if (styles.length > 0) {
      formattedText = `<span style="${styles.join('; ')}">${formattedText}</span>`;
    }

    return formattedText;
  };

  const toggleFormatting = (type: keyof RichNoteFormatting) => {
    if (typeof formatting[type] === 'boolean') {
      setFormatting(prev => ({
        ...prev,
        [type]: !prev[type]
      }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal rich-annotations-modal">
        <div className="modal-header">
          <h3>Rich Annotations</h3>
          <button onClick={onClose} className="modal-close" title="Close annotations">
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {/* Voice Memo Section */}
          <div className="annotation-section">
            <h4>
              <Mic size={16} />
              Voice Memo
            </h4>
            
            <div className="voice-memo-controls">
              {!isRecording && !audioBlob && (
                <button onClick={startRecording} className="record-button">
                  <Mic size={16} />
                  Start Recording
                </button>
              )}

              {isRecording && (
                <div className="recording-controls">
                  <button onClick={stopRecording} className="stop-button">
                    <Square size={16} />
                    Stop ({formatTime(recordingDuration)})
                  </button>
                  <div className="recording-indicator">
                    <div className="recording-dot"></div>
                    Recording...
                  </div>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="playback-controls">
                  <button 
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="play-button"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <span className="duration">Duration: {formatTime(recordingDuration)}</span>
                                     <button onClick={() => {
                     setAudioBlob(null);
                     setAudioDataURL(null);
                     setRecordingDuration(0);
                   }} className="delete-button" title="Delete recording">
                     <X size={16} />
                     Delete
                   </button>
                </div>
              )}
            </div>

            {audioBlob && (
              <div className="transcription-section">
                <label htmlFor="transcription">Transcription (optional):</label>
                <textarea
                  id="transcription"
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Add a transcription of your voice memo..."
                  rows={3}
                />
              </div>
            )}

            {audioBlob && (
              <button onClick={handleSaveVoiceMemo} className="save-memo-button">
                <Save size={16} />
                Save Voice Memo
              </button>
            )}
          </div>

          {/* Rich Text Note Section */}
          <div className="annotation-section">
            <h4>
              <Type size={16} />
              Rich Text Note
            </h4>
            
            <div className="formatting-toolbar">
              <button
                onClick={() => toggleFormatting('bold')}
                className={`format-button ${formatting.bold ? 'active' : ''}`}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => toggleFormatting('italic')}
                className={`format-button ${formatting.italic ? 'active' : ''}`}
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => toggleFormatting('underline')}
                className={`format-button ${formatting.underline ? 'active' : ''}`}
                title="Underline"
              >
                <Underline size={14} />
              </button>
              
              <div className="format-group">
                <label>
                  <Palette size={14} />
                  <input
                    type="color"
                    value={formatting.color}
                    onChange={(e) => setFormatting(prev => ({ ...prev, color: e.target.value }))}
                    title="Text Color"
                  />
                </label>
                <label>
                  <span style={{ fontSize: '12px' }}>BG</span>
                  <input
                    type="color"
                    value={formatting.backgroundColor}
                    onChange={(e) => setFormatting(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    title="Background Color"
                  />
                </label>
              </div>

              <select
                value={formatting.fontSize}
                onChange={(e) => setFormatting(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="font-size-select"
                title="Font size"
                aria-label="Font size"
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
              </select>

              <select
                value={formatting.fontFamily}
                onChange={(e) => setFormatting(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="font-family-select"
                title="Font family"
                aria-label="Font family"
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Helvetica">Helvetica</option>
              </select>
            </div>

            <textarea
              ref={textAreaRef}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your rich text note..."
              className="rich-text-input"
              style={{
                fontWeight: formatting.bold ? 'bold' : 'normal',
                fontStyle: formatting.italic ? 'italic' : 'normal',
                textDecoration: formatting.underline ? 'underline' : 'none',
                color: formatting.color,
                backgroundColor: formatting.backgroundColor,
                fontSize: `${formatting.fontSize}px`,
                fontFamily: formatting.fontFamily
              }}
              rows={6}
            />

            {noteContent.trim() && (
              <button onClick={handleSaveRichNote} className="save-note-button">
                <Save size={16} />
                Save Rich Note
              </button>
            )}
          </div>
        </div>

        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      </div>
    </div>
  );
};

export default RichAnnotations; 