import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaRobot, FaPaperPlane, FaDatabase } from 'react-icons/fa';

const escapeHtml = (value = '') =>
  value.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });

const applyBasicMarkdown = (value = '') =>
  escapeHtml(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

const renderMessageContent = (text = '') => {
  if (!text) {
    return '';
  }

  const lines = text.split(/\r?\n/);
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (/^[-•'’]\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const content = trimmed.replace(/^[-•'’]\s+/, '');
      html += `<li>${applyBasicMarkdown(content)}</li>`;
      return;
    }

    if (trimmed.length === 0) {
      closeList();
      return;
    }

    closeList();
    html += `<p>${applyBasicMarkdown(trimmed)}</p>`;
  });

  closeList();
  return html;
};

const NexusFloatingButton = ({ onClick }) => (
  <button
    type="button"
    className="nexus-floating-button"
    onClick={onClick}
    aria-label="Open Nexus AI chat"
  >
    <FaRobot />
    <span>Chat with Nexus</span>
  </button>
);

const NexusChatModal = ({
  open,
  onClose,
  messages,
  loading,
  error,
  onSend,
  activeChart,
  chartTitle,
  lastSql,
  model,
  isGeneralConversation = false
}) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setDraft('');
    }
  }, [open]);

  useEffect(() => {
    if (open && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages, loading]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) {
      return;
    }
    const value = draft.trim();
    if (!value) {
      return;
    }
    onSend?.(value);
    setDraft('');
  };

  if (!open) {
    return null;
  }

  return (
    <div className="nexus-modal-overlay" role="dialog" aria-modal="true" aria-label="Nexus AI analytics chat">
      <div className="nexus-modal">
        <div className="nexus-modal-header">
          <div className="nexus-title">
            <FaRobot />
            <div>
              <h2>Nexus • AI Analytics</h2>
              <p>
                {isGeneralConversation
                  ? 'Ask about any aspect of your business data—Nexus can fetch the relevant numbers for you.'
                  : chartTitle ? `Analyzing ${chartTitle}` : 'Ask about any analytics visualization.'}
              </p>
            </div>
          </div>
          <button className="nexus-close-btn" type="button" onClick={onClose} aria-label="Close Nexus chat">
            <FaTimes />
          </button>
        </div>
        <div className="nexus-modal-body">
          <div className="nexus-message-log">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className={`nexus-message nexus-${message.role}`}>
                  <div className="nexus-message-author">
                    {message.role === 'user' ? 'You' : 'Nexus'}
                  </div>
                  <div
                    className="nexus-message-content"
                    dangerouslySetInnerHTML={{ __html: renderMessageContent(message.content) }}
                  />
                  {message.metadata?.sql && (
                    <details className="nexus-sql-details">
                      <summary>
                        <FaDatabase />
                        <span>SQL &amp; data preview</span>
                      </summary>
                      <pre>{message.metadata.sql}</pre>
                      {Array.isArray(message.metadata.rows) && message.metadata.rows.length > 0 && (
                        <pre>{JSON.stringify(message.metadata.rows.slice(0, 10), null, 2)}</pre>
                      )}
                      {typeof message.metadata.rowCount === 'number' && (
                        <p className="nexus-sql-meta">Rows returned: {message.metadata.rowCount}</p>
                      )}
                      {message.metadata.model && (
                        <p className="nexus-sql-meta">Model: {message.metadata.model}</p>
                      )}
                    </details>
                  )}
                </div>
              ))
            ) : !loading && (
              <div className="nexus-empty-state">
                <p>Ask about any metric, branch, or time window to get started.</p>
              </div>
            )}
            {loading && (
              <div className="nexus-message nexus-assistant">
                <div className="nexus-message-author">Nexus</div>
                <div className="nexus-message-content">Analyzing data…</div>
              </div>
            )}
            {error && messages.length === 0 && (
              <div className="nexus-error-banner">
                {error}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form className="nexus-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={activeChart || isGeneralConversation ? 'Ask a follow-up question…' : 'Select a chart to get started'}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={loading || (!activeChart && !isGeneralConversation)}
            />
            <button type="submit" disabled={loading || !draft.trim()}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export { renderMessageContent, applyBasicMarkdown, escapeHtml };
export default NexusChatModal;
export { NexusFloatingButton };

