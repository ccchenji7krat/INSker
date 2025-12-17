// app/page.tsx
'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// Types
type ExtractedData = {
  id: string;
  fileName: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  username?: string;
  emails?: string[];
  confidence?: string;
};

export default function Home() {
  const [queue, setQueue] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newItems: ExtractedData[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      status: 'idle',
      fileObj: file, // Store temporarily for processing
    } as any));

    setQueue((prev) => [...prev, ...newItems]);
  };

  // 2. Process Queue Logic
  const processQueue = async () => {
    setIsProcessing(true);
    const itemsToProcess = queue.filter(i => i.status === 'idle');

    for (const item of itemsToProcess) {
      // Update status to processing
      updateItemStatus(item.id, 'processing');

      try {
        const base64 = await toBase64(item.fileObj);
        
        const res = await fetch('/api/extract', {
          method: 'POST',
          body: JSON.stringify({ base64Image: base64 }),
        });
        
        const data = await res.json();
        
        setQueue(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'done', username: data.username, emails: data.emails, confidence: data.confidence } 
            : i
        ));
      } catch (err) {
        updateItemStatus(item.id, 'error');
      }
    }
    setIsProcessing(false);
  };

  const updateItemStatus = (id: string, status: string) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status: status } : i) as any);
  };

  // 3. Excel Export Logic
  const downloadExcel = () => {
    const rows = queue
      .filter(item => item.status === 'done')
      .map(item => ({
        Username: item.username,
        // Join multiple emails with comma
        Email: item.emails?.join(', ') || 'N/A',
        Source_File: item.fileName,
        Confidence: item.confidence,
        Profile_URL: item.username ? `https://instagram.com/${item.username}` : ''
      }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Influencers");
    XLSX.writeFile(workbook, "influencer_leads.xlsx");
  };

  // Utility
  const toBase64 = (file: File) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen flex flex-col font-sans bg-gray-50">
      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-800">InstaScraper MVP</h1>
        <p className="text-sm text-gray-500">Upload screenshots to extract leads.</p>
      </header>

      {/* Upload Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-300 text-center mb-6">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileUpload} 
          className="hidden" 
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="text-blue-600 font-semibold mb-1">Tap to Upload</div>
          <div className="text-xs text-gray-400">Supports batch upload</div>
        </label>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
            <div className="truncate max-w-[60%]">
              <div className="text-sm font-medium truncate">{item.fileName}</div>
              {item.status === 'done' && (
                <div className="text-xs text-green-600">
                  @{item.username} • {item.emails?.length || 0} emails
                </div>
              )}
            </div>
            <div className="text-xs font-bold">
              {item.status === 'idle' && <span className="text-gray-400">PENDING</span>}
              {item.status === 'processing' && <span className="text-blue-500 animate-pulse">Scanning...</span>}
              {item.status === 'done' && <span className="text-green-500">✔ SAVED</span>}
              {item.status === 'error' && <span className="text-red-500">FAILED</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-4 gap-3 flex flex-col">
        {queue.some(i => i.status === 'idle') && (
          <button 
            onClick={processQueue} 
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : `Process ${queue.filter(i => i.status === 'idle').length} Images`}
          </button>
        )}
        
        {queue.some(i => i.status === 'done') && (
          <button 
            onClick={downloadExcel} 
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
          >
            Download Excel (.xlsx)
          </button>
        )}
      </div>
    </main>
  );
}
