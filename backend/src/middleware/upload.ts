import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
const ALLOWED_EXTENSIONS = ['.kml', '.kmz', '.geojson', '.json', '.dxf', '.tif', '.tiff'];
const ALLOWED_MIME_TYPES = [
  'application/vnd.google-earth.kml+xml',
  'application/vnd.google-earth.kmz',
  'application/geo+json',
  'application/json',
  'application/dxf',
  'image/tiff',
  'application/octet-stream', // Generic binary for KMZ
];

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// Initialize upload directory
ensureUploadDir();

// Storage configuration
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uniqueId}${ext}`;
    cb(null, safeName);
  },
});

// File filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    return;
  }

  // Check MIME type (less strict, as browsers may not set correct MIME for KMZ)
  const isValidMime =
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    file.mimetype.startsWith('application/') ||
    file.mimetype.startsWith('image/');

  if (!isValidMime) {
    cb(new Error(`Invalid file MIME type: ${file.mimetype}`));
    return;
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files at once
  },
});

// Export upload middleware variants
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
export const uploadFields = upload.fields([
  { name: 'boundary', maxCount: 1 },
  { name: 'exclusions', maxCount: 10 },
  { name: 'dem', maxCount: 1 },
]);

// Error handling middleware for multer
export function handleUploadError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed per upload',
      });
      return;
    }
    res.status(400).json({
      error: 'Upload error',
      message: err.message,
    });
    return;
  }

  if (err.message.includes('File type not allowed') || err.message.includes('Invalid file')) {
    res.status(400).json({
      error: 'Invalid file',
      message: err.message,
    });
    return;
  }

  next(err);
}

// Cleanup uploaded file
export async function cleanupFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.error('Failed to cleanup file:', filepath, error);
  }
}

// Get file info
export interface UploadedFileInfo {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
}

export function getFileInfo(file: Express.Multer.File): UploadedFileInfo {
  return {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname).toLowerCase(),
  };
}

export default upload;
