'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';

export default function DocumentsPage() {
  const { currentCompany } = useAppStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (currentCompany) {
      loadDocuments();
    }
  }, [currentCompany]);

  const loadDocuments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !currentCompany) return;

    setUploading(true);
    // In production, upload to S3 first, then save metadata
    // For now, create a placeholder document
    try {
      await api.post(`/companies/${currentCompany.id}/documents`, {
        filename: file.name,
        fileUrl: URL.createObjectURL(file), // Placeholder
        fileType: file.type,
        fileSize: file.size,
      });
      loadDocuments();
      setShowUploadModal(false);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Document uploaded successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Upload Failed',
        message: error.response?.data?.error?.message || 'Failed to upload document',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="🏢"
        title="No company selected"
        description="Select a company from the sidebar to view documents"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Document Library</h1>
          <p className="text-white/60">
            {currentCompany.name} — Document management with version control
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          + Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No documents yet"
          description="Upload your first file to get started"
          action={
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              Upload Document
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="font-semibold mb-2">{doc.filename}</div>
                <div className="text-sm text-white/60 mb-2">
                  {(doc.fileSize / 1024).toFixed(2)} KB
                </div>
                <div className="text-xs text-white/40 mb-3">
                  Version {doc.version} • {new Date(doc.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowViewModal(true);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowVersionsModal(true);
                    }}
                  >
                    Versions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          uploading={uploading}
          dragActive={dragActive}
          onDrag={handleDrag}
          onDrop={handleDrop}
        />
      )}

      {showViewModal && selectedDocument && (
        <ViewDocumentModal
          document={selectedDocument}
          onClose={() => {
            setShowViewModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {showEditModal && selectedDocument && (
        <EditDocumentModal
          document={selectedDocument}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDocument(null);
          }}
          onSave={loadDocuments}
        />
      )}

      {showVersionsModal && selectedDocument && (
        <VersionsModal
          document={selectedDocument}
          onClose={() => {
            setShowVersionsModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {showDeleteModal && selectedDocument && (
        <DeleteDocumentModal
          document={selectedDocument}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedDocument(null);
          }}
          onDelete={async () => {
            setDeleting(true);
            try {
              await api.delete(`/documents/${selectedDocument.id}`);
              loadDocuments();
              setShowDeleteModal(false);
              setSelectedDocument(null);
              setNotification({
                isOpen: true,
                title: 'Success',
                message: 'Document deleted successfully',
                type: 'success',
              });
            } catch (error: any) {
              setNotification({
                isOpen: true,
                title: 'Delete Failed',
                message: error.response?.data?.error?.message || 'Failed to delete document',
                type: 'error',
              });
            } finally {
              setDeleting(false);
            }
          }}
          deleting={deleting}
        />
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

function FileUploadModal({
  onClose,
  onUpload,
  uploading,
  dragActive,
  onDrag,
  onDrop,
}: {
  onClose: () => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-white/40"
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
          </div>
          <p className="text-white/80 mb-2">
            {dragActive ? 'Drop file here' : 'Drag and drop a file here'}
          </p>
          <p className="text-white/40 text-sm mb-4">or</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Browse Files'}
          </Button>
          <p className="text-white/40 text-xs mt-4">
            Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
          </p>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ViewDocumentModal({
  document,
  onClose,
}: {
  document: any;
  onClose: () => void;
}) {
  const [previewError, setPreviewError] = useState(false);
  const [isBlobUrl, setIsBlobUrl] = useState(false);

  useEffect(() => {
    // Check if the URL is a blob URL (temporary, expires on page reload)
    if (document.fileUrl && document.fileUrl.startsWith('blob:')) {
      setIsBlobUrl(true);
      setPreviewError(true);
    }
  }, [document.fileUrl]);

  const handleDownload = () => {
    if (document.fileUrl) {
      // For blob URLs, try to open in new tab
      // For regular URLs, download or open
      window.open(document.fileUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handlePreviewError = () => {
    setPreviewError(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">View Document</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/60">File Name</label>
            <div className="text-lg font-semibold">{document.filename}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">File Size</label>
              <div>{formatFileSize(document.fileSize)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">File Type</label>
              <div>{document.fileType || 'Unknown'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">Version</label>
              <div>Version {document.version}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">Uploaded</label>
              <div>{new Date(document.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {document.fileUrl && (
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">Preview</label>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                {previewError || isBlobUrl ? (
                  <div className="text-center text-white/60">
                    <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-semibold mb-2">Preview Unavailable</p>
                    {isBlobUrl ? (
                      <>
                        <p className="text-sm mb-2">This document was uploaded with a temporary file URL that has expired.</p>
                        <p className="text-sm text-white/40">Please re-upload the document or use a file storage service (S3, etc.) for permanent access.</p>
                      </>
                    ) : (
                      <p className="text-sm">The file could not be loaded. Click &quot;Download / Open&quot; to view the file.</p>
                    )}
                  </div>
                ) : document.fileType?.startsWith('image/') ? (
                  <img
                    src={document.fileUrl}
                    alt={document.filename}
                    className="max-w-full max-h-[500px] rounded"
                    onError={handlePreviewError}
                  />
                ) : document.fileType === 'application/pdf' ? (
                  <iframe
                    src={document.fileUrl}
                    className="w-full h-[500px] rounded border border-white/10"
                    title={document.filename}
                    onLoad={() => {
                      // Iframe loaded, but we can't detect errors easily
                      // The blob URL check should catch most issues
                    }}
                  />
                ) : (
                  <div className="text-center text-white/60">
                    <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p>Preview not available for this file type</p>
                    <p className="text-sm mt-2">Click Download to view the file</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {document.fileUrl && (
            <Button variant="primary" onClick={handleDownload}>
              Download / Open
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditDocumentModal({
  document,
  onClose,
  onSave,
}: {
  document: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [filename, setFilename] = useState(document.filename);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!filename.trim()) return;

    setSaving(true);
    try {
      await api.put(`/documents/${document.id}`, {
        filename: filename.trim(),
      });
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to update document:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-6">Edit Document</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">File Name</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter file name"
            />
          </div>
          <div className="text-sm text-white/60">
            <div>File Size: {(document.fileSize / 1024).toFixed(2)} KB</div>
            <div>File Type: {document.fileType || 'Unknown'}</div>
            <div>Version: {document.version}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !filename.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VersionsModal({
  document,
  onClose,
}: {
  document: any;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [document]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/documents/${document.id}/versions`);
      setVersions(response.data.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Document Versions</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div className="font-semibold text-lg mb-1">{document.filename}</div>
          <div className="text-sm text-white/60">All versions of this document</div>
        </div>

        {loading ? (
          <div className="text-white/60 text-center py-8">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="text-white/60 text-center py-8">No previous versions found</div>
        ) : (
          <div className="space-y-3">
            {versions.map((version: any) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <div>
                  <div className="font-semibold">Version {version.version}</div>
                  <div className="text-sm text-white/60">
                    {new Date(version.createdAt).toLocaleString()}
                  </div>
                  {version.changes && (
                    <div className="text-xs text-white/40 mt-1">{version.changes}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {version.fileUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(version.fileUrl, '_blank')}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteDocumentModal({
  document,
  onClose,
  onDelete,
  deleting,
}: {
  document: any;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Delete Document</h2>
        <p className="text-white/80 mb-6">
          Are you sure you want to delete <span className="font-semibold">{document.filename}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        </div>
      </div>
    </div>
  );
}


