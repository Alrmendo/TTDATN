import { useState, FormEvent, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { API_BASE } from '../config/api';

interface AiAssistantWidgetProps {
  userRole: 'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý chi nhánh' | '';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiAssistantWidget({ userRole }: AiAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isLoading]);

  // Chỉ Manager và BranchManager mới thấy khung chat AI này.
  if (userRole !== 'Quản lý' && userRole !== 'Quản lý chi nhánh') {
    return null;
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Trợ lý AI đang gặp lỗi, vui lòng thử lại.');
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || '' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Bot className="w-4.5 h-4.5" />
              <span className="text-sm font-bold">Trợ lý AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-6">
                Hỏi tôi về doanh thu, tồn kho, sản phẩm bán chạy, hoặc cách dùng hệ thống.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#3B82F6] text-white ml-auto rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-1.5 text-gray-400 text-xs px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang trả lời...</span>
              </div>
            )}
            {error && <p className="text-xs text-rose-500 px-1">{error}</p>}
          </div>

          <form onSubmit={handleSend} className="border-t border-gray-200 p-2.5 flex items-center space-x-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#3B82F6] text-white p-2 rounded-lg disabled:opacity-40 hover:bg-blue-600 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/40 flex items-center justify-center hover:bg-blue-600 transition"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
