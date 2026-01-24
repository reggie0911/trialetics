"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SplitResult } from '@/lib/types/csv-splitter';

interface CsvSplitterFormProps {
  onSplitComplete: (result: SplitResult) => void;
  onError: (error: string) => void;
}

export function CsvSplitterForm({ onSplitComplete, onError }: CsvSplitterFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rowsPerChunk, setRowsPerChunk] = useState(10000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      onError('Please select a CSV file');
      return;
    }
    setFile(selectedFile);
  }, [onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleSplit = useCallback(async () => {
    if (!file) {
      onError('Please select a file first');
      return;
    }

    // Validate rows per chunk
    if (rowsPerChunk < 1) {
      onError('Rows per chunk must be at least 1');
      return;
    }

    if (rowsPerChunk > 1000000) {
      onError('Rows per chunk cannot exceed 1,000,000');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rowsPerChunk', rowsPerChunk.toString());

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const response = await fetch('/api/csv-splitter/split', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = 'Failed to split CSV file';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result: SplitResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to split CSV file');
      }

      setProgress(100);
      onSplitComplete(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      onError(errorMessage);
      setProgress(0);
    } finally {
      setIsProcessing(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 2000);
    }
  }, [file, rowsPerChunk, onSplitComplete, onError]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV File Splitter</CardTitle>
        <CardDescription>
          Upload a large CSV file to split it into smaller chunks. Each chunk will include the first two header rows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-2">
          <Label>CSV File</Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-input hover:border-primary/50',
              file && 'border-primary bg-primary/5'
            )}
          >
            {file ? (
              <div className="flex items-center justify-center gap-4">
                <FileText className="size-8 text-primary" />
                <div className="flex-1 text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFile(null)}
                  disabled={isProcessing}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="size-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isProcessing}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isProcessing}
                >
                  Select File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Rows Per Chunk Input */}
        <div className="space-y-2">
          <Label htmlFor="rowsPerChunk">Rows Per Chunk</Label>
          <Input
            id="rowsPerChunk"
            type="number"
            min="1"
            value={rowsPerChunk}
            onChange={(e) => setRowsPerChunk(parseInt(e.target.value) || 10000)}
            disabled={isProcessing}
          />
          <p className="text-sm text-muted-foreground">
            Number of data rows (excluding headers) per chunk file. Default: 10,000
          </p>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress}>
              <div className="flex justify-between text-sm w-full">
                <ProgressLabel>Processing...</ProgressLabel>
                <ProgressValue>{() => `${progress}%`}</ProgressValue>
              </div>
            </Progress>
          </div>
        )}

        {/* Split Button */}
        <Button
          onClick={handleSplit}
          disabled={!file || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? 'Processing...' : 'Split CSV File'}
        </Button>

        {/* File Size Warning */}
        {file && file.size < 100 * 1024 * 1024 && (
          <p className="text-sm text-muted-foreground">
            Note: File size is less than 100MB. This tool is optimized for larger files.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
