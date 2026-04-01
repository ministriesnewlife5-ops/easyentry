'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Video, X } from 'lucide-react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  type?: 'image' | 'video' | 'both';
  label?: string;
  className?: string;
  preview?: string | null;
  onClear?: () => void;
}

export default function DragDropUpload({
  onFileSelect,
  accept,
  maxSize = 10,
  type = 'both',
  label,
  className = '',
  preview,
  onClear,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAcceptTypes = () => {
    if (accept) return accept;
    if (type === 'image') return 'image/*';
    if (type === 'video') return 'video/*';
    return 'image/*,video/*';
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Check file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return false;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return false;
    }
    if (type === 'both' && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please upload an image or video file');
      return false;
    }

    return true;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const Icon = type === 'image' ? ImageIcon : type === 'video' ? Video : Upload;

  if (preview) {
    return (
      <div className={`relative ${className}`}>
        {type === 'video' || (preview && preview.includes('video')) ? (
          <video
            src={preview}
            className="w-full h-full object-cover rounded-xl"
            controls
          />
        ) : (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover rounded-xl"
          />
        )}
        {onClear && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#0D0D0D]/80 text-[#F5F5DC] hover:bg-[#EB4D4B] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative border-2 border-dashed rounded-xl p-6 
          flex flex-col items-center justify-center gap-3
          cursor-pointer transition-all min-h-[160px]
          ${isDragging 
            ? 'border-[#E5A823] bg-[#E5A823]/10' 
            : 'border-[#2A2A2A] hover:border-[#E5A823]/50 bg-[#1A1A1A]'
          }
        `}
        onClick={() => document.getElementById(`file-input-${type}`)?.click()}
      >
        <input
          id={`file-input-${type}`}
          type="file"
          accept={getAcceptTypes()}
          onChange={handleFileInput}
          className="hidden"
        />

        <motion.div
          animate={{ 
            y: isDragging ? -10 : 0,
            scale: isDragging ? 1.1 : 1 
          }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center
            ${isDragging ? 'bg-[#E5A823]' : 'bg-[#2A2A2A]'}
          `}
        >
          <Icon className={`w-6 h-6 ${isDragging ? 'text-[#0D0D0D]' : 'text-[#F5F5DC]/50'}`} />
        </motion.div>

        <div className="text-center">
          <p className="text-sm font-medium text-[#F5F5DC]">
            {isDragging ? 'Drop it here!' : label || `Drag & drop ${type === 'both' ? 'image or video' : type}`}
          </p>
          <p className="text-xs text-[#F5F5DC]/40 mt-1">
            or click to browse (max {maxSize}MB)
          </p>
        </div>

        {isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 rounded-xl border-2 border-[#E5A823] pointer-events-none"
          />
        )}
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-[#EB4D4B] mt-2 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
