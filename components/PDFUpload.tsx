'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { BAA } from '@/types';

interface PDFUploadProps {
  onUploadComplete: (baa: BAA) => void;
  onContinue?: () => void;
}

export default function PDFUpload({ onUploadComplete, onContinue }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedBAA, setUploadedBAA] = useState<BAA | null>(null);

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
      setUploadedBAA(baa);
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
            : uploadedBAA
            ? 'border-[#059669] bg-[#ecfdf5]'
            : 'border-[#d1d5db] hover:border-[#9ca3af] bg-white'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin mb-3" />
            <p className="text-xs text-[#6b7280]">Processing...</p>
          </div>
        ) : uploadedBAA ? (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-[#059669] mb-2" />
            <p className="text-sm font-medium text-[#065f46] mb-1">BAA Document Parsed Successfully</p>
            <p className="text-xs text-[#6b7280]">Click "Continue" below to proceed</p>
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

      {/* BAA Info Summary */}
      {uploadedBAA && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-[#1a1a1a] mb-2">BAA Document Summary</h3>
          <div className="bg-[#f9fafb] border border-[#d1d5db] p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#6b7280] mb-0.5">Document Title</p>
                <p className="text-[#1a1a1a] font-medium">{uploadedBAA.title}</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">File Name</p>
                <p className="text-[#1a1a1a] font-medium mono text-xs">{uploadedBAA.fileName}</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Sections Identified</p>
                <p className="text-[#1a1a1a] font-medium">{uploadedBAA.sections?.length || 0} sections</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Requirements Found</p>
                <p className="text-[#1a1a1a] font-medium">{uploadedBAA.requirements?.length || 0} requirements</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Deadlines Identified</p>
                <p className="text-[#1a1a1a] font-medium">{uploadedBAA.deadlines?.length || 0} deadlines</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Document Structure</p>
                <p className="text-[#1a1a1a] font-medium">{uploadedBAA.structure?.length || 0} structure elements</p>
              </div>
              {uploadedBAA.rawText && (
                <div className="col-span-2">
                  <p className="text-[#6b7280] mb-0.5">Content Length</p>
                  <p className="text-[#1a1a1a] font-medium mono">{uploadedBAA.rawText.length.toLocaleString()} characters</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                onUploadComplete(uploadedBAA);
                if (onContinue) {
                  onContinue();
                }
              }}
              className="px-4 py-1.5 bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] transition-colors border border-[#059669] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Continue to Organization Context
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
