/**
 * ComplianceGap ChatInterface Component
 * Interactive chat interface for gap analysis clarifications
 */

import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function ChatInterface({ analysisId, onClarificationAnswered }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (analysisId) {
      loadClarifications();
    }
  }, [analysisId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadClarifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/compliancegap/analysis/${analysisId}/clarifications`);
      const data = await response.json();

      if (data.success && data.clarifications) {
        const chatMessages = data.clarifications.map(clar => ({
          id: clar.id,
          type: 'question',
          text: clar.question_text,
          timestamp: clar.asked_at,
          status: clar.status,
          answer: clar.answer_text
        }));

        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading clarifications:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // If this is answering a pending question, find the clarification ID
      const pendingQuestion = messages.find(m => m.type === 'question' && m.status === 'pending');
      
      if (pendingQuestion) {
        // Answer the clarification
        const response = await fetch(`${API_BASE}/compliancegap/clarifications/${pendingQuestion.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerText: input })
        });

        const data = await response.json();
        
        if (data.success) {
          const answerMessage = {
            id: Date.now() + 1,
            type: 'answer',
            text: input,
            timestamp: new Date().toISOString()
          };

          setMessages(prev => prev.map(msg => 
            msg.id === pendingQuestion.id 
              ? { ...msg, status: 'answered', answer: input }
              : msg
          ).concat(answerMessage));

          if (onClarificationAnswered) {
            onClarificationAnswered(pendingQuestion.id, input);
          }
        }
      } else {
        // Add new clarification question
        const response = await fetch(`${API_BASE}/compliancegap/analysis/${analysisId}/clarifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionText: input })
        });

        const data = await response.json();
        
        if (data.success) {
          const questionMessage = {
            id: data.clarification.id,
            type: 'question',
            text: input,
            timestamp: data.clarification.asked_at,
            status: 'pending'
          };

          setMessages(prev => [...prev, questionMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        text: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>Analysis Clarifications</h3>
        {analysisId && <span className="analysis-id">Analysis: {analysisId.substring(0, 8)}...</span>}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No clarifications yet. Ask questions about the gap analysis.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.type}`}>
              <div className="message-header">
                <span className="message-type">
                  {msg.type === 'question' ? '❓ Question' : 
                   msg.type === 'answer' ? '💬 Answer' : 
                   msg.type === 'user' ? '👤 You' : '⚠️ Error'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{msg.text}</div>
              {msg.type === 'question' && msg.answer && (
                <div className="message-answer">
                  <strong>Answer:</strong> {msg.answer}
                </div>
              )}
              {msg.type === 'question' && msg.status === 'pending' && (
                <div className="message-status pending">Pending answer</div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or provide clarification..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="chat-send-button">
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

