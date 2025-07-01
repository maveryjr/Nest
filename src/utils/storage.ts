import { SavedLink, Collection, Category, StorageData } from '../types';

const DB_NAME = 'NestDB';
const DB_VERSION = 1;
const STORE_NAME = 'nestData';

class StorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async getData(): Promise<StorageData> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('data');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const defaultData: StorageData = {
          links: [],
          collections: [],
          categories: [
            { id: 'general', name: 'General', color: '#6b7280', isDefault: true },
            { id: 'work', name: 'Work', color: '#3b82f6' },
            { id: 'personal', name: 'Personal', color: '#10b981' },
            { id: 'learning', name: 'Learning', color: '#f59e0b' }
          ],
          settings: {
            defaultCategory: 'general',
            autoSummarize: true
          }
        };
        resolve(request.result || defaultData);
      };
    });
  }

  async saveData(data: StorageData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, 'data');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addLink(link: SavedLink): Promise<void> {
    const data = await this.getData();
    data.links.push(link);
    await this.saveData(data);
  }

  async updateLink(linkId: string, updates: Partial<SavedLink>): Promise<void> {
    const data = await this.getData();
    const linkIndex = data.links.findIndex(link => link.id === linkId);
    if (linkIndex !== -1) {
      data.links[linkIndex] = { ...data.links[linkIndex], ...updates, updatedAt: new Date() };
      await this.saveData(data);
    }
  }

  async deleteLink(linkId: string): Promise<void> {
    const data = await this.getData();
    data.links = data.links.filter(link => link.id !== linkId);
    await this.saveData(data);
  }

  async addCollection(collection: Collection): Promise<void> {
    const data = await this.getData();
    data.collections.push(collection);
    await this.saveData(data);
  }

  async updateCollection(collectionId: string, updates: Partial<Collection>): Promise<void> {
    const data = await this.getData();
    const collectionIndex = data.collections.findIndex(col => col.id === collectionId);
    if (collectionIndex !== -1) {
      data.collections[collectionIndex] = { ...data.collections[collectionIndex], ...updates, updatedAt: new Date() };
      await this.saveData(data);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const data = await this.getData();
    data.collections = data.collections.filter(col => col.id !== collectionId);
    // Move all links from this collection back to holding area
    data.links.forEach(link => {
      if (link.collectionId === collectionId) {
        link.collectionId = undefined;
      }
    });
    await this.saveData(data);
  }
}

export const storage = new StorageManager(); 