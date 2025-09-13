import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  Music, 
  Video,
  Image as ImageIcon,
  File,
  ExternalLink
} from 'lucide-react';

interface MessageMediaProps {
  mediaUrl: string;
  mediaType: string;
  fileName?: string;
  fileSize?: number;
  mimetype?: string;
  className?: string;
}

export function MessageMedia({ 
  mediaUrl, 
  mediaType, 
  fileName, 
  fileSize, 
  mimetype,
  className = '' 
}: MessageMediaProps) {
  const [imageError, setImageError] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const fullUrl = `${baseUrl}${mediaUrl}`;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(1)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  };

  const getMediaIcon = () => {
    if (mediaType.includes('image')) return <ImageIcon className="h-4 w-4" />;
    if (mediaType.includes('audio')) return <Music className="h-4 w-4" />;
    if (mediaType.includes('video')) return <Video className="h-4 w-4" />;
    if (mediaType.includes('document') || mediaType === 'document') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName || 'archivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderImagePreview = () => (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <img
        src={fullUrl}
        alt={fileName || 'Imagen'}
        className="max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleDownload}
        onError={() => setImageError(true)}
      />
      {!imageError && (
        <div className="flex items-center justify-between p-2 bg-black/5">
          <span className="text-xs text-gray-600">
            {fileName && `${fileName} • `}{formatFileSize(fileSize)}
          </span>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderAudioPlayer = () => (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <Music className="h-5 w-5 text-blue-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">{fileName || 'Audio'}</p>
          <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <audio controls className="w-full h-8">
        <source src={fullUrl} type={mimetype} />
        Tu navegador no soporta el elemento de audio.
      </audio>
    </div>
  );

  const renderVideoPlayer = () => (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <video 
        controls 
        className="max-w-full h-auto max-h-64"
        preload="metadata"
      >
        <source src={fullUrl} type={mimetype} />
        Tu navegador no soporta el elemento de video.
      </video>
      <div className="flex items-center justify-between p-2 bg-black/5">
        <span className="text-xs text-gray-600">
          {fileName && `${fileName} • `}{formatFileSize(fileSize)}
        </span>
        <Button size="sm" variant="ghost" onClick={handleDownload}>
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  const renderFilePreview = () => (
    <div className={`bg-gray-50 rounded-lg p-3 flex items-center gap-3 ${className}`}>
      <div className="flex-shrink-0">
        {getMediaIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || 'Archivo'}</p>
        <p className="text-xs text-gray-500">
          {formatFileSize(fileSize)}
          {mimetype && ` • ${mimetype.split('/')[1]?.toUpperCase()}`}
        </p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => window.open(fullUrl, '_blank')}>
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDownload}>
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  // Si hay error cargando imagen o tipo no reconocido
  if (imageError || !mediaUrl) {
    return renderFilePreview();
  }

  // Renderizar según el tipo de media
  if (mediaType.includes('image')) {
    return renderImagePreview();
  } else if (mediaType.includes('audio')) {
    return renderAudioPlayer();
  } else if (mediaType.includes('video')) {
    return renderVideoPlayer();
  } else {
    return renderFilePreview();
  }
}
