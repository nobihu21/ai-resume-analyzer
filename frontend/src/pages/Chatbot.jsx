import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { Send, MessageCircle, Loader } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI career assistant. I can help you with:\n\n📝 Resume tips and improvements\n🎯 Interview preparation\n💼 Career advice\n🔍 Job market insights\n\nWhat would you like help with today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call the AI service
      const chatHistory = messages
        .filter(m => m.sender === 'user')
        .map(m => ({
          role: 'user',
          content: m.text
        }));

      const response = await api.post('/api/chat', {
        messages: [
          ...chatHistory,
          {
            role: 'user',
            content: input
          }
        ],
        userId: user?.uid
      }, {
        timeout: 30000
      });

      const botMessage = {
        id: messages.length + 2,
        text: response.data.response || "I couldn't generate a response. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error. Please make sure the backend is running and try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "How can I improve my resume?",
    "Common interview questions for my field",
    "How to optimize for ATS?",
    "Career growth strategies"
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div>
      <h2 className="mb-4 d-flex align-items-center gap-2">
        <MessageCircle size={28} className="text-accent" />
        AI Career Assistant
      </h2>

      <div className="row">
        <div className="col-lg-8">
          <Card className="glass-card border-0" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            {/* Messages Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      backgroundColor: msg.sender === 'user' ? 'var(--accent)' : '#F1F5F9',
                      color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                      lineHeight: '1.5'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="d-flex justify-content-start">
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <Form onSubmit={handleSendMessage}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Form.Control
                    type="text"
                    placeholder="Ask anything about your career..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    style={{ borderRadius: '8px' }}
                  />
                  <Button
                    className="btn-primary-custom"
                    type="submit"
                    disabled={loading || !input.trim()}
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </Form>
            </div>
          </Card>
        </div>

        {/* Sidebar with Quick Prompts */}
        <div className="col-lg-4">
          <Card className="glass-card border-0">
            <Card.Body>
              <h5 className="mb-3">Quick Questions</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(prompt)}
                    style={{
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = 'var(--accent)';
                      e.target.style.backgroundColor = '#F0F7FF';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.backgroundColor = 'white';
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <hr />

              <h5 className="mb-3">Tips</h5>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <p>💡 <strong>Be specific:</strong> The more details you provide, the better the advice.</p>
                <p>💡 <strong>Ask follow-ups:</strong> Feel free to ask clarifying questions.</p>
                <p>💡 <strong>Save responses:</strong> You can copy and save helpful advice.</p>
              </div>
            </Card.Body>
          </Card>

          <Card className="glass-card border-0 mt-3 accent-border">
            <Card.Body>
              <h5 className="mb-2">📊 Conversation Stats</h5>
              <div style={{ fontSize: '0.9rem' }}>
                <p className="mb-2"><strong>Messages:</strong> {messages.length}</p>
                <p className="mb-0"><strong>Session:</strong> Active</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
