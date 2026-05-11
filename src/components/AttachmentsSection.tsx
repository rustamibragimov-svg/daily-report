import { useRef, useState } from 'react';
import { Paperclip, Upload, Trash2, Download, FileText, Loader2, X } from 'lucide-react';
import {
  useAttachments, useUploadAttachments, useDeleteAttachment,
  getFileUrl, formatFileSize, type Attachment,
} from '@/hooks/useAttachments';

function FileIcon() {
  return <FileText size={15} className="text-gray-400 shrink-0" />;
}

function AttachmentRow({ file, reportDate }: { file: Attachment; reportDate: string }) {
  const [confirming, setConfirming] = useState(false);
  const deleteM = useDeleteAttachment(reportDate);

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return; }
    deleteM.mutate({ id: file.id, filePath: file.file_path });
    setConfirming(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 group border-b border-gray-100 last:border-0 transition-colors">
      <FileIcon />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{file.file_name}</p>
        <p className="text-xs text-gray-400">{formatFileSize(file.file_size)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={getFileUrl(file.file_path)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
          title="Скачать"
        >
          <Download size={13} />
        </a>
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="px-2 py-0.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
            >
              Удалить
            </button>
            <button onClick={() => setConfirming(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Удалить"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AttachmentsSection({ reportDate }: { reportDate: string }) {
  const { data: files, isLoading } = useAttachments(reportDate);
  const upload = useUploadAttachments(reportDate);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected?.length) return;
    upload.mutate(Array.from(selected));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="section-card">
      <div className="section-header bg-[#1C1C2E]">
        <Paperclip size={14} className="opacity-70" />
        Вложения
        {!!files?.length && (
          <span className="ml-auto text-white/50 text-xs font-normal">{files.length} файл{files.length > 1 ? 'а' : ''}</span>
        )}
      </div>
      <div className="p-5 space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {upload.isPending ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-sm">Загрузка...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload size={22} className={dragging ? 'text-blue-500' : ''} />
              <p className="text-sm font-medium text-gray-600">
                {dragging ? 'Отпустите файлы' : 'Перетащите файлы или нажмите для выбора'}
              </p>
              <p className="text-xs text-gray-400">Любые форматы, несколько файлов одновременно</p>
            </div>
          )}
        </div>

        {/* File list */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-gray-300" />
          </div>
        )}
        {!isLoading && !!files?.length && (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {files.map(file => (
              <AttachmentRow key={file.id} file={file} reportDate={reportDate} />
            ))}
          </div>
        )}
        {!isLoading && !files?.length && (
          <p className="text-xs text-center text-gray-300 py-2">Файлов пока нет</p>
        )}
      </div>
    </div>
  );
}
