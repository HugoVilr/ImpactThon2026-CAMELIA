import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { X, Download, Beaker } from 'lucide-react';

interface AIDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  isLoading: boolean;
}

export default function AIDiscoveryModal({ isOpen, onClose, markdownContent, isLoading }: AIDiscoveryModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (!contentRef.current) return;
    const opt = {
      margin:       15,
      filename:     'Protein_Intelligence_Dossier.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Beaker className="icon" size={24} color="#059669" /> 
            Protein Intelligence Dossier
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>El prodigio IA está analizando los datos estructurales...</p>
            </div>
          ) : (
            <div className="markdown-container" ref={contentRef}>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-primary btn-download" 
            onClick={handleDownloadPdf}
            disabled={isLoading || !markdownContent}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={18} /> Exportar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
