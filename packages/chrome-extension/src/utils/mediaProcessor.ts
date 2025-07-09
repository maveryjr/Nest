import { MediaContent, MediaAttachment } from '../types';
import { createWorker } from 'tesseract.js';

/**
 * MediaProcessor - Handles extraction and processing of various media types
 * Supports OCR for images, transcription for audio, PDF text extraction, etc.
 */
export class MediaProcessor {
  private ocrWorker: any = null;
  private isOcrInitialized = false;

  constructor() {
    this.initializeOCR();
  }

  /**
   * Initialize Tesseract.js worker for OCR processing
   */
  private async initializeOCR(): Promise<void> {
    try {
      this.ocrWorker = await createWorker('eng');
      this.isOcrInitialized = true;
      console.log('MediaProcessor: OCR worker initialized');
    } catch (error) {
      console.error('MediaProcessor: Failed to initialize OCR worker:', error);
    }
  }

  /**
   * Process screenshot image with OCR
   */
  async processScreenshot(imageData: string): Promise<MediaContent> {
    console.log('MediaProcessor: Processing screenshot with OCR');
    const startTime = Date.now();

    try {
      if (!this.isOcrInitialized) {
        await this.initializeOCR();
      }

      let extractedText = '';
      if (this.ocrWorker) {
        const { data: { text } } = await this.ocrWorker.recognize(imageData);
        extractedText = text.trim();
      }

      // Get image dimensions
      const dimensions = await this.getImageDimensions(imageData);

      const processingTime = Date.now() - startTime;
      console.log(`MediaProcessor: OCR completed in ${processingTime}ms, extracted ${extractedText.length} characters`);

      return {
        type: 'image',
        originalData: imageData,
        extractedText,
        metadata: {
          filename: `screenshot_${Date.now()}.png`,
          dimensions,
          processingTimeMs: processingTime,
          ocrConfidence: extractedText.length > 0 ? 0.8 : 0.1, // Rough confidence estimate
        }
      };
    } catch (error) {
      console.error('MediaProcessor: Screenshot OCR failed:', error);
      return {
        type: 'image',
        originalData: imageData,
        extractedText: '',
        metadata: {
          filename: `screenshot_${Date.now()}.png`,
          error: error.message,
        }
      };
    }
  }

  /**
   * Process voice memo with transcription
   */
  async processVoiceMemo(audioBlob: Blob): Promise<MediaContent> {
    console.log('MediaProcessor: Processing voice memo');
    const startTime = Date.now();

    try {
      // Try Web Speech API first (if available)
      let extractedText = '';
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        extractedText = await this.transcribeWithWebSpeech(audioBlob);
      }

      // If Web Speech API failed or unavailable, could integrate with OpenAI Whisper here
      if (!extractedText) {
        extractedText = await this.transcribeWithWhisper(audioBlob);
      }

      const duration = await this.getAudioDuration(audioBlob);
      const processingTime = Date.now() - startTime;

      console.log(`MediaProcessor: Voice transcription completed in ${processingTime}ms`);

      return {
        type: 'audio',
        originalData: audioBlob,
        extractedText,
        metadata: {
          filename: `voice_memo_${Date.now()}.webm`,
          duration,
          mimeType: audioBlob.type,
          size: audioBlob.size,
          processingTimeMs: processingTime,
        }
      };
    } catch (error) {
      console.error('MediaProcessor: Voice transcription failed:', error);
      return {
        type: 'audio',
        originalData: audioBlob,
        extractedText: '',
        metadata: {
          filename: `voice_memo_${Date.now()}.webm`,
          error: error.message,
        }
      };
    }
  }

  /**
   * Process PDF file and extract text
   */
  async processPDF(pdfData: ArrayBuffer): Promise<MediaContent> {
    console.log('MediaProcessor: Processing PDF');
    const startTime = Date.now();

    try {
      // PDF processing is not available in browser environment
      // For now, we'll return basic info about the PDF
      throw new Error('PDF text extraction is not available in browser environment. Consider using a server-side solution.');

              // This code won't execute due to the throw above, but keeping for reference
        const processingTime = Date.now() - startTime;
        
        return {
          type: 'pdf',
          originalData: pdfData,
          extractedText: '',
          metadata: {
            filename: `document_${Date.now()}.pdf`,
            size: pdfData.byteLength,
            processingTimeMs: processingTime,
          }
        };
    } catch (error) {
      console.error('MediaProcessor: PDF processing failed:', error);
      return {
        type: 'pdf',
        originalData: pdfData,
        extractedText: '',
        metadata: {
          filename: `document_${Date.now()}.pdf`,
          size: pdfData.byteLength,
          error: error.message,
        }
      };
    }
  }

  /**
   * Process email content and extract structured data
   */
  async processEmail(emailHTML: string, emailMetadata?: any): Promise<MediaContent> {
    console.log('MediaProcessor: Processing email');
    
    try {
      // Parse HTML and extract text content
      const parser = new DOMParser();
      const doc = parser.parseFromString(emailHTML, 'text/html');
      
      // Extract text content, removing script and style elements
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      const extractedText = doc.body?.textContent?.trim() || '';
      
      // Extract email-specific metadata
      const subject = doc.querySelector('meta[name="subject"]')?.getAttribute('content') || 
                     emailMetadata?.subject || 'Unknown Subject';
      const from = emailMetadata?.from || 'Unknown Sender';
      const date = emailMetadata?.date || new Date();

      return {
        type: 'email',
        originalData: emailHTML,
        extractedText,
        metadata: {
          subject,
          from,
          publishDate: date,
          wordCount: extractedText.split(/\s+/).length,
        }
      };
    } catch (error) {
      console.error('MediaProcessor: Email processing failed:', error);
      return {
        type: 'email',
        originalData: emailHTML,
        extractedText: '',
        metadata: {
          error: error.message,
        }
      };
    }
  }

  /**
   * Process social media post and extract structured data
   */
  async processSocialPost(postHTML: string, platform: string, postMetadata?: any): Promise<MediaContent> {
    console.log(`MediaProcessor: Processing ${platform} post`);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(postHTML, 'text/html');
      
      // Platform-specific extraction logic
      let extractedText = '';
      let author = '';
      let publishDate: Date | undefined;
      
      switch (platform.toLowerCase()) {
        case 'twitter':
        case 'x':
          extractedText = this.extractTwitterContent(doc);
          author = this.extractTwitterAuthor(doc);
          publishDate = this.extractTwitterDate(doc);
          break;
        case 'linkedin':
          extractedText = this.extractLinkedInContent(doc);
          author = this.extractLinkedInAuthor(doc);
          break;
        case 'medium':
          extractedText = this.extractMediumContent(doc);
          author = this.extractMediumAuthor(doc);
          break;
        default:
          // Generic extraction
          extractedText = doc.body?.textContent?.trim() || '';
      }

      return {
        type: 'social',
        originalData: postHTML,
        extractedText,
        metadata: {
          platform,
          author: author || postMetadata?.author,
          publishDate: publishDate || postMetadata?.publishDate,
          wordCount: extractedText.split(/\s+/).length,
        }
      };
    } catch (error) {
      console.error(`MediaProcessor: ${platform} post processing failed:`, error);
      return {
        type: 'social',
        originalData: postHTML,
        extractedText: '',
        metadata: {
          platform,
          error: error.message,
        }
      };
    }
  }

  /**
   * Create MediaAttachment from MediaContent
   */
  createAttachment(content: MediaContent, linkId: string): MediaAttachment {
    const id = `${linkId}_${content.type}_${Date.now()}`;
    
    // Convert data to appropriate storage format
    let dataURL: string | undefined;
    let storageKey: string | undefined;
    
    if (typeof content.originalData === 'string') {
      dataURL = content.originalData;
    } else if (content.originalData instanceof Blob) {
      // For larger files, we'd store in cloud storage and keep a key
      // For now, convert small blobs to data URLs
      if (content.originalData.size < 1024 * 1024) { // < 1MB
        dataURL = URL.createObjectURL(content.originalData);
      } else {
        storageKey = `attachments/${linkId}/${id}`;
      }
    }

    return {
      id,
      type: content.type as any,
      filename: content.metadata.filename || `${content.type}_${Date.now()}`,
      mimeType: content.metadata.mimeType || this.getMimeType(content.type),
      size: content.metadata.size || 0,
      dataURL,
      storageKey,
      extractedText: content.extractedText,
      metadata: content.metadata,
      createdAt: new Date(),
    };
  }

  // Helper methods
  private async getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = imageData;
    });
  }

  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(audioBlob);
    });
  }

  private async transcribeWithWebSpeech(audioBlob: Blob): Promise<string> {
    // Web Speech API transcription implementation
    // Note: This is a simplified version - real implementation would be more complex
    return new Promise((resolve) => {
      // Placeholder implementation
      resolve('');
    });
  }

  private async transcribeWithWhisper(audioBlob: Blob): Promise<string> {
    // OpenAI Whisper API integration would go here
    // For now, return empty string as fallback
    console.log('MediaProcessor: Whisper transcription not implemented yet');
    return '';
  }

  private extractTwitterContent(doc: Document): string {
    // Twitter-specific content extraction
    const tweetText = doc.querySelector('[data-testid="tweetText"]');
    return tweetText?.textContent?.trim() || '';
  }

  private extractTwitterAuthor(doc: Document): string {
    const authorElement = doc.querySelector('[data-testid="User-Name"]');
    return authorElement?.textContent?.trim() || '';
  }

  private extractTwitterDate(doc: Document): Date | undefined {
    const timeElement = doc.querySelector('time');
    const datetime = timeElement?.getAttribute('datetime');
    return datetime ? new Date(datetime) : undefined;
  }

  private extractLinkedInContent(doc: Document): string {
    // LinkedIn-specific content extraction
    const contentElement = doc.querySelector('.feed-shared-update-v2__description');
    return contentElement?.textContent?.trim() || '';
  }

  private extractLinkedInAuthor(doc: Document): string {
    const authorElement = doc.querySelector('.feed-shared-actor__name');
    return authorElement?.textContent?.trim() || '';
  }

  private extractMediumContent(doc: Document): string {
    // Medium-specific content extraction
    const article = doc.querySelector('article');
    return article?.textContent?.trim() || '';
  }

  private extractMediumAuthor(doc: Document): string {
    const authorElement = doc.querySelector('[rel="author"]');
    return authorElement?.textContent?.trim() || '';
  }

  private getMimeType(type: string): string {
    const mimeTypes = {
      'image': 'image/png',
      'audio': 'audio/webm',
      'video': 'video/webm',
      'pdf': 'application/pdf',
      'email': 'text/html',
      'social': 'text/html',
    };
    return mimeTypes[type] || 'application/octet-stream';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
      this.isOcrInitialized = false;
    }
  }
}

// Export singleton instance
export const mediaProcessor = new MediaProcessor(); 