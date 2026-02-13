'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { BAA } from '@/types';

interface PDFUploadProps {
  onUploadComplete: (baa: BAA) => void;
}

export default function PDFUpload({ onUploadComplete }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const baa = await response.json();
      onUploadComplete(baa);
    } catch (err) {
      setError('Failed to upload and parse PDF. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Ingest Solicitation Document</h2>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-6 text-center cursor-pointer ${
          isDragActive
            ? 'border-[#2563eb] bg-[#eff6ff]'
            : 'border-[#d1d5db] hover:border-[#9ca3af] bg-white'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin mb-3" />
            <p className="text-xs text-[#6b7280]">Processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#f3f4f6] border border-[#d1d5db] flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-[#374151]" />
            </div>
            <p className="text-sm font-medium text-[#1a1a1a] mb-1">
              {isDragActive ? 'Release to ingest' : 'Drag document here'}
            </p>
            <p className="text-xs text-[#6b7280] mb-3">or</p>
            <button className="px-4 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]">
              Select File
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-[#fef2f2] border border-[#fecaca]">
          <p className="text-xs text-[#991b1b] font-medium">Error: {error}</p>
        </div>
      )}
    </div>
  );
}
