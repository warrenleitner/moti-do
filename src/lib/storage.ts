/**
 * Storage utility for handling local file-based persistence
 */

// We only need to declare the global window methods that TypeScript doesn't recognize
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: {
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
  }
}

/**
 * Save application data to a specified local file
 * @param data - Data to be saved
 * @param filePath - Path to save the file (if browser supports)
 */
export const saveToLocalFile = async (data: unknown, filePath?: string): Promise<void> => {
  try {
    // For browsers with File System Access API
    if (window.showSaveFilePicker && !filePath) {
      const options = {
        suggestedName: 'moti-do-data.json',
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      };
      
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      return;
    }
    
    // For browsers without File System Access API - download as a file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moti-do-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error saving to local file:', error);
    throw error;
  }
};

/**
 * Load application data from a specified local file
 * @returns The parsed data from the local file
 */
export const loadFromLocalFile = async (): Promise<unknown> => {
  try {
    // For browsers with File System Access API
    if (window.showOpenFilePicker) {
      const options = {
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
        multiple: false,
      };
      
      const [handle] = await window.showOpenFilePicker(options);
      const file = await handle.getFile();
      const text = await file.text();
      
      return JSON.parse(text);
    }
    
    // For browsers without File System Access API - manual file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            resolve(data);
          } catch {
            reject(new Error('Invalid JSON file'));
          }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
      };
      
      input.click();
    });
  } catch (error) {
    console.error('Error loading from local file:', error);
    throw error;
  }
}; 