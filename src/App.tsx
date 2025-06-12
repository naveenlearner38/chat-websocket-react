import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css'

// Define types
interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
}

interface TypingIndicator {
  user: string;
  isTyping: boolean;
}

function App() {
  // State management
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userList, setUserList] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://192.168.236.184:3000');
    setSocket(newSocket);
    
    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Handle previous messages
    socket.on('previousMessages', (previousMessages: ChatMessage[]) => {
      setMessages(previousMessages);
    });
    
    // Handle new message
    socket.on('newMessage', (newMessage: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });
    
    // Handle user joined
    socket.on('userJoined', (notification: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, notification]);
    });
    
    // Handle user left
    socket.on('userLeft', (notification: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, notification]);
    });
    
    // Handle user list updates
    socket.on('userList', (users: string[]) => {
      setUserList(users);
    });
    
    // Handle typing indicators
    socket.on('userTyping', ({ user, isTyping }: TypingIndicator) => {
      if (isTyping) {
        setTypingUsers((prev) => [...prev.filter(u => u !== user), user]);
      } else {
        setTypingUsers((prev) => prev.filter(u => u !== user));
      }
    });
    
    // Cleanup event listeners
    return () => {
      socket.off('previousMessages');
      socket.off('newMessage');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userList');
      socket.off('userTyping');
    };
  }, [socket]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle join chat
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !username.trim()) return;
    
    socket.emit('join', username);
    setHasJoined(true);
  };
  
  // Handle sending messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !message.trim()) return;
    
    socket.emit('sendMessage', message);
    setMessage('');
    
    // Clear typing indicator
    if (isTyping) {
      socket.emit('typing', false);
      setIsTyping(false);
    }
  };
  
  // Handle typing indicators
  const handleTyping = () => {
    if (!socket || !isTyping) {
      socket?.emit('typing', true);
      setIsTyping(true);
    }
    
    // Clear typing indicator after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = window.setTimeout(() => {
      if (socket && isTyping) {
        socket.emit('typing', false);
        setIsTyping(false);
      }
    }, 2000);
  };
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Render login form if not joined
  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Join Chat</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Enter your username"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Render chat interface if joined
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - User List */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Online Users ({userList.length})</h2>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {userList.map((user, index) => (
              <li 
                key={index} 
                className="flex items-center space-x-2"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className={user === username ? "font-bold text-blue-600" : "text-gray-700"}>{user}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <div className="bg-white p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold">Chat Room</h1>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.user === username ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    msg.user === 'system' 
                      ? 'bg-gray-200 text-center mx-auto' 
                      : msg.user === username 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-purple-100 text-gray-800'
                  }`}
                >
                  {msg.user !== 'system' && msg.user !== username && (
                    <div className="font-semibold text-sm">{msg.user}</div>
                  )}
                  <p>{msg.text}</p>
                  <div className="text-xs text-right mt-1">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {typingUsers.length > 0 && (
              <div className="text-sm text-gray-500 italic">
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} is typing...` 
                  : `${typingUsers.join(', ')} are typing...`}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Message Input */}
        <div className="bg-white p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              disabled={!message.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
