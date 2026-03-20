import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Plus, Activity, Pill, Heart, Brain, Stethoscope,
  ShieldCheck, FileText, AlertCircle, X
} from 'lucide-react'
import './App.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STARTER_QUESTIONS = [
  "What are common symptoms of Type 2 diabetes?",
  "How does Medicare vs Medicaid work?",
  "When should I go to the ER vs urgent care?",
  "What is a normal blood pressure range?",
  "How do I read my lab results?",
  "What vaccines do adults need annually?",
]

const SIDEBAR_TOPICS = [
  { icon: <Heart size={14} />, label: 'Cardiology & Heart Health' },
  { icon: <Brain size={14} />, label: 'Mental Health & Psychiatry' },
  { icon: <Pill size={14} />, label: 'Medications & Drugs' },
  { icon: <Activity size={14} />, label: 'Lab Results & Tests' },
  { icon: <ShieldCheck size={14} />, label: 'Insurance & Coverage' },
  { icon: <Stethoscope size={14} />, label: 'Finding Specialists' },
  { icon: <FileText size={14} />, label: 'Medical Procedures' },
  { icon: <AlertCircle size={14} />, label: 'Symptoms & Diagnosis' },
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<[hul])(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match
      return `<p>${match}</p>`
    })
}

function BotAvatar() {
  return (
    <div className="avatar bot">
      <Stethoscope size={15} color="white" />
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="avatar user">U</div>
  )
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTopic, setActiveTopic] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setError(null)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Server error')
      }

      const data = await res.json()

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setError(null)
    setActiveTopic(null)
  }

  const handleTopicClick = (topic: { label: string }, idx: number) => {
    setActiveTopic(idx)
    sendMessage(`Tell me about: ${topic.label}`)
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Stethoscope size={18} color="white" />
            </div>
            <span className="logo-text">True Care Assist</span>
          </div>
          <div className="logo-sub">US MEDICAL AI ASSISTANT</div>
        </div>

        <button className="sidebar-new-chat" onClick={handleNewChat}>
          <Plus size={14} />
          New Conversation
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Medical Topics</div>
        </div>

        <div className="sidebar-topics">
          {SIDEBAR_TOPICS.map((topic, idx) => (
            <div
              key={idx}
              className={`topic-item ${activeTopic === idx ? 'active' : ''}`}
              onClick={() => handleTopicClick(topic, idx)}
            >
              <span className="topic-icon">{topic.icon}</span>
              <span>{topic.label}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="disclaimer-badge">
            ⚠️ For informational purposes only. Always consult a licensed physician for medical advice.
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-container">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">
            <span className="topbar-name">True Care Cost Assistant</span>
            <div className="topbar-status">
              <div className="status-dot" />
              <span>Online </span>
            </div>
          </div>
          <div className="topbar-meta">
            <div className="meta-badge">
              <ShieldCheck size={11} />
              HIPAA Aware
            </div>
            <div className="meta-badge">
              <Activity size={11} />
              US Healthcare
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area">
          <div className="messages-inner">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-icon">
                  <Stethoscope size={32} color="white" />
                </div>
                <h1 className="welcome-title">How can I help you today?</h1>
                <p className="welcome-subtitle">
                  Ask me anything about US healthcare — symptoms, medications, insurance, procedures, or finding the right specialist.
                </p>
                <div className="starter-chips">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button key={i} className="starter-chip" onClick={() => sendMessage(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={`message-row ${msg.role === 'user' ? 'user' : 'bot'} animate-in`}
                  style={{ animationDelay: `${i === messages.length - 1 ? 0 : 0}ms` }}
                >
                  {msg.role === 'assistant' ? <BotAvatar /> : <UserAvatar />}
                  <div className="bubble-wrapper">
                    <div className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                      {msg.role === 'assistant' ? (
                        <div
                          className="bubble-content"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      ) : (
                        msg.content
                      )}
                    </div>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="message-row bot animate-in">
                <BotAvatar />
                <div className="bubble-wrapper">
                  <div className="typing-bubble">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="message-row bot animate-in">
                <BotAvatar />
                <div className="bubble-wrapper">
                  <div className="bubble bot" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
                      <AlertCircle size={14} />
                      <span>{error}</span>
                      <button
                        onClick={() => setError(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrapper">
            <div className="input-box justify-center">
              <textarea
                ref={textareaRef}
                className="input-field"
                placeholder="Ask about symptoms, medications, insurance, procedures..."
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize() }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="input-hint">
              TrueCare Assist only answers US medical questions · Not a substitute for professional medical advice · Press Enter to send
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
