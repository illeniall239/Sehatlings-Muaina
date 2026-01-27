'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadDropzoneProps {
  onFileUpload: (file: File) => void;
  acceptedFileTypes?: string[];
}

export function UploadDropzone({ onFileUpload, acceptedFileTypes = ['.pdf', '.docx'] }: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  return (
    <div 
      {...getRootProps()} 
      className={`cursor-pointer p-8 rounded-lg border-2 border-dashed ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-primary/30'
      } transition-colors`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-center text-primary font-medium">Drop the files here ...</p>
      ) : (
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-muted-foreground" 
            stroke="currentColor" 
            fill="none" 
            viewBox="0 0 48 48"
          >
            <path 
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
              strokeWidth={2} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {acceptedFileTypes.join(', ')} files (MAX. 50MB)
          </p>
        </div>
      )}
    </div>
  );
}