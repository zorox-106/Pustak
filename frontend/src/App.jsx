import React, { useState, useEffect } from 'react';
import { Upload, MessageSquare, BookOpen, BrainCircuit, Send, FileText, CheckCircle2, Loader2, LogOut, User, Lock, Trash2, PlusCircle, UserCircle, GraduationCap, School, Calendar, Target, RefreshCw, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument, chatWithDoc, getSummary, getMCQs, signupUser, loginUser, getDocuments, deleteDocument, getProfile, updateProfile } from './api/client';

const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('pustak_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('pustak_user'));
  const [authMode, setAuthMode] = useState('login'); // login, signup
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(() => localStorage.getItem('pustak_filename') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [docId, setDocId] = useState(() => localStorage.getItem('pustak_doc_id') || null);
  const [activeTab, setActiveTab] = useState('summary'); // chat, summary, mcqs, profile
  
  const [messages, setMessages] = useState({}); // docId -> messages[]
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [summaries, setSummaries] = useState({}); // docId -> summary string
  const [allMcqs, setAllMcqs] = useState({}); // docId -> mcqs[]
  const [userAnswers, setUserAnswers] = useState({}); // docId -> { questionIdx -> answer }
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const [profile, setProfile] = useState({ full_name: '', college: '', year: '', goals: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDocuments();
      fetchProfile();
    }
  }, [token]);

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile(profile);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        await signupUser(authData.username, authData.password);
        alert('Signup successful! Please login.');
        setAuthMode('login');
      } else {
        const data = await loginUser(authData.username, authData.password);
        setToken(data.token);
        setUsername(data.username);
        localStorage.setItem('pustak_token', data.token);
        localStorage.setItem('pustak_user', data.username);
      }
    } catch (err) {
      alert('Auth failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUsername(null);
    setDocId(null);
    setFileName('');
    setDocuments([]);
    setMessages({});
    setSummaries({});
    setAllMcqs({});
    setProfile({ full_name: '', college: '', year: '', goals: '' });
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    
    try {
      const data = await uploadDocument(selectedFile);
      setDocId(data.doc_id);
      setFileName(selectedFile.name);
      localStorage.setItem('pustak_doc_id', data.doc_id);
      localStorage.setItem('pustak_filename', selectedFile.name);
      
      await fetchDocuments();
      setIsUploading(false);
      setActiveTab('summary');
      fetchSummary(data.doc_id);
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
      setIsUploading(false);
    }
  };

  const fetchSummary = async (id) => {
    if (summaries[id]) return;
    setIsLoadingContent(true);
    try {
      const data = await getSummary(id);
      setSummaries(prev => ({ ...prev, [id]: data.summary }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const fetchMCQs = async (id, forceRefresh = false) => {
    if (allMcqs[id] && !forceRefresh) return;
    setIsLoadingContent(true);
    try {
      const data = await getMCQs(id);
      setAllMcqs(prev => ({ ...prev, [id]: data.mcqs }));
      // Clear previous answers if refreshing
      if (forceRefresh) {
        setUserAnswers(prev => ({ ...prev, [id]: {} }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !docId) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), userMsg]
    }));
    setInput('');
    setIsTyping(true);

    try {
      const data = await chatWithDoc(docId, input);
      setMessages(prev => ({
        ...prev,
        [docId]: [...(prev[docId] || []), { role: 'assistant', content: data.answer, citations: data.citations }]
      }));
    } catch (err) {
      console.error(err);
      setMessages(prev => ({
        ...prev,
        [docId]: [...(prev[docId] || []), { role: 'assistant', content: 'Sorry, I encountered an error answering your question.' }]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionClick = (questionIdx, selectedOption) => {
    const currentAnswers = userAnswers[docId] || {};
    if (currentAnswers[questionIdx]) return;
    setUserAnswers(prev => ({
      ...prev,
      [docId]: { ...currentAnswers, [questionIdx]: selectedOption }
    }));
  };

  const handleSelectDocument = (id, name) => {
    setDocId(id);
    setFileName(name);
    localStorage.setItem('pustak_doc_id', id);
    localStorage.setItem('pustak_filename', name);
    setActiveTab('summary');
    fetchSummary(id);
  };

  const handleDeleteDocument = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.doc_id !== id));
      if (docId === id) {
        setDocId(null);
        setFileName('');
        localStorage.removeItem('pustak_doc_id');
        localStorage.removeItem('pustak_filename');
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] shadow-2xl border max-w-md w-full"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary-600 p-3 rounded-2xl text-white mb-4">
              <BrainCircuit size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Pustak</h2>
            <p className="text-slate-500 mt-2">Your AI Notes Assistant</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Enter username"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={authData.username}
                  onChange={(e) => setAuthData({...authData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="Enter password"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={authData.password}
                  onChange={(e) => setAuthData({...authData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50 mt-4"
            >
              {authLoading ? <Loader2 className="animate-spin mx-auto" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-primary-600 font-bold hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-slate-50">
      {/* Header */}
      <header className="w-full max-w-[1400px] flex justify-between items-center p-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 p-2 rounded-xl text-white">
            <BrainCircuit size={28} />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Pustak</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeTab === 'profile' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`}
          >
            <UserCircle size={18} />
            <span className="text-sm font-bold">{profile.full_name || username}</span>
          </button>
          <button 
            onClick={handleLogout}
            title="Log Out"
            className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-full shadow-sm border"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="w-full max-w-[1400px] flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 p-6">
        {/* Sidebar - Multiple Notes Management */}
        <aside className="bg-white rounded-[32px] border shadow-sm p-6 flex flex-col h-[calc(100vh-140px)] sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-lg">My Notes</h3>
            <label className="cursor-pointer bg-primary-50 text-primary-600 p-2 rounded-lg hover:bg-primary-100 transition-all">
              <PlusCircle size={20} />
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {isUploading && (
              <div className="p-4 rounded-2xl bg-primary-50 border border-primary-100 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-primary-600" />
                <span className="text-xs font-bold text-primary-700 animate-pulse">Uploading...</span>
              </div>
            )}
            
            {documents.length === 0 && !isUploading ? (
              <div className="text-center py-10 opacity-40">
                <FileText size={48} className="mx-auto mb-2" />
                <p className="text-sm">No notes yet</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div 
                  key={doc.doc_id}
                  onClick={() => handleSelectDocument(doc.doc_id, doc.file_name)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${docId === doc.doc_id && activeTab !== 'profile' ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-white hover:border-primary-300 hover:shadow-sm text-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${docId === doc.doc_id && activeTab !== 'profile' ? 'bg-white/20' : 'bg-slate-100'} p-2 rounded-lg`}>
                      <FileText size={18} />
                    </div>
                    <span className="text-sm font-bold truncate pr-6">{doc.file_name}</span>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteDocument(e, doc.doc_id)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-opacity ${docId === doc.doc_id && activeTab !== 'profile' ? 'hover:bg-white/20' : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600'}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex flex-col gap-6">
          {activeTab === 'profile' ? (
            /* Profile Section */
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] border shadow-sm p-10 flex flex-col h-full"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary-100 p-3 rounded-2xl">
                  <UserCircle className="text-primary-600" size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Student Profile</h2>
                  <p className="text-slate-500">Manage your details and learning goals</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Your Name"
                          className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                          value={profile.full_name}
                          onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700 ml-1">College/University</label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="University Name"
                          className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                          value={profile.college}
                          onChange={(e) => setProfile({...profile, college: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700 ml-1">Academic Year</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="e.g. 2nd Year"
                          className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                          value={profile.year}
                          onChange={(e) => setProfile({...profile, year: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
                  >
                    {isSavingProfile ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
                  </button>
                </form>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                      <Target size={18} className="text-primary-600" />
                      Future Goals & Notes
                    </label>
                    <textarea 
                      placeholder="What are you working towards? (e.g. Master React, Get Internship at Google...)"
                      rows={8}
                      className="w-full bg-slate-50 border-none rounded-2xl p-6 focus:ring-2 focus:ring-primary-500 transition-all outline-none text-slate-700 font-medium resize-none"
                      value={profile.goals}
                      onChange={(e) => setProfile({...profile, goals: e.target.value})}
                    />
                  </div>
                  <div className="p-6 bg-primary-50 rounded-[32px] border border-primary-100">
                    <h4 className="font-bold text-primary-800 mb-2">Study Tip</h4>
                    <p className="text-sm text-primary-600 leading-relaxed">Setting clear, written goals can improve your focus by up to 40%. Keep your Pustak goals updated!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !docId ? (
            /* Landing / Empty Section */
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] border shadow-sm p-12 flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="max-w-md">
                <div className="bg-primary-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="text-primary-600" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome back, {profile.full_name || username}!</h2>
                <p className="text-slate-500 mb-8">Select a note from the sidebar to continue studying, or upload a new PDF to get started.</p>
                <label className="cursor-pointer inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all">
                  <Upload size={20} />
                  <span>Upload PDF</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Note Header / Tabs */}
              <div className="bg-white p-2 rounded-[28px] border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'summary' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <BookOpen size={18} />
                    <span>Summary</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'chat' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <MessageSquare size={18} />
                    <span>Ask AI</span>
                  </button>
                  <button 
                    onClick={() => { setActiveTab('mcqs'); fetchMCQs(docId); }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'mcqs' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <CheckCircle2 size={18} />
                    <span>Quiz</span>
                  </button>
                </div>
                <div className="px-6 border-l hidden md:block">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active File</p>
                   <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{fileName}</p>
                </div>
              </div>

              {/* Dynamic Content Panel */}
              <section className="bg-white rounded-[40px] shadow-sm border h-[calc(100vh-230px)] flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'chat' && (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full p-8"
                    >
                      <div className="flex-1 space-y-6 mb-6 overflow-y-auto pr-2 custom-scrollbar">
                        {(messages[docId] || []).length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                            <MessageSquare size={64} />
                            <p className="text-lg">Ask anything about "{fileName}"</p>
                          </div>
                        )}
                        {(messages[docId] || []).map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-5 rounded-[28px] ${msg.role === 'user' ? 'bg-primary-600 text-white shadow-lg rounded-tr-none' : 'bg-slate-100 border shadow-sm rounded-tl-none text-slate-700'}`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} className={`prose max-w-none prose-p:leading-relaxed ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                                {msg.content}
                              </ReactMarkdown>
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-black/10">
                                  {msg.citations.map((cite, idx) => (
                                    <span key={idx} className="text-[10px] uppercase font-bold tracking-wider bg-black/5 px-2 py-1 rounded-md">
                                      {cite}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="bg-slate-100 border p-5 rounded-[28px] rounded-tl-none">
                              <Loader2 className="animate-spin text-primary-600" size={20} />
                            </div>
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleSendMessage} className="flex gap-3 bg-slate-50 p-3 rounded-3xl border shadow-inner">
                        <input 
                          type="text" 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask a question..."
                          className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-700 font-medium"
                        />
                        <button type="submit" disabled={isTyping || !input.trim()} className="bg-primary-600 text-white p-3 rounded-2xl hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50">
                          <Send size={20} />
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'summary' && (
                    <motion.div 
                      key="summary"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-10 overflow-y-auto h-full custom-scrollbar"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-primary-100 p-3 rounded-2xl">
                          <BookOpen className="text-primary-600" size={28} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900">Notes Summary</h2>
                      </div>
                      {isLoadingContent && !summaries[docId] ? (
                        <div className="flex flex-col items-center justify-center h-[60%] gap-4 text-slate-400">
                          <Loader2 className="animate-spin" size={48} />
                          <p className="font-medium animate-pulse">Analyzing document...</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-3xl border p-8 shadow-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-900 prose-li:my-2 prose-table:border prose-table:rounded-xl prose-table:overflow-hidden text-slate-700 text-lg">
                            {summaries[docId] || "Click 'Summary' to generate notes."}
                          </ReactMarkdown>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'mcqs' && (
                    <motion.div 
                      key="mcqs"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-10 overflow-y-auto h-full custom-scrollbar"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary-100 p-3 rounded-2xl">
                            <CheckCircle2 className="text-primary-600" size={28} />
                          </div>
                          <h2 className="text-3xl font-bold text-slate-900">Knowledge Check</h2>
                        </div>
                        <button 
                          onClick={() => fetchMCQs(docId, true)}
                          disabled={isLoadingContent}
                          className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                        >
                          {isLoadingContent ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                          <span>Refresh Quiz</span>
                        </button>
                      </div>

                      {isLoadingContent && (!allMcqs[docId] || allMcqs[docId].length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-[60%] gap-4 text-slate-400">
                          <Loader2 className="animate-spin" size={48} />
                          <p className="font-medium animate-pulse">Crafting fresh questions...</p>
                        </div>
                      ) : allMcqs[docId] && allMcqs[docId].length > 0 ? (
                        <div className="space-y-8 pb-10">
                          {allMcqs[docId].map((q, idx) => {
                            const answers = userAnswers[docId] || {};
                            const isAnswered = answers[idx] !== undefined;
                            const selectedOption = answers[idx];
                            const isCorrect = selectedOption === (q.correct_answer || q.answer);

                            return (
                              <div key={idx} className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                  <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">{idx + 1}</span>
                                  <p className="text-xl font-bold text-slate-800 leading-tight">{q.question || q.Question}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-10">
                                  {(q.options || q.Options || []).map((opt, i) => {
                                    let buttonStyle = "bg-slate-50 border-slate-100 text-slate-700";
                                    if (isAnswered) {
                                      if (opt === (q.correct_answer || q.answer)) {
                                        buttonStyle = "bg-green-100 border-green-500 text-green-700 shadow-sm ring-1 ring-green-500";
                                      } else if (opt === selectedOption && !isCorrect) {
                                        buttonStyle = "bg-red-100 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500";
                                      } else {
                                        buttonStyle = "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
                                      }
                                    } else {
                                      buttonStyle = "hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer";
                                    }

                                    return (
                                      <button 
                                        key={i} 
                                        disabled={isAnswered}
                                        onClick={() => handleOptionClick(idx, opt)}
                                        className={`text-left p-5 rounded-2xl border font-bold transition-all ${buttonStyle}`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                <AnimatePresence>
                                  {isAnswered && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className={`ml-10 p-5 rounded-2xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                                    >
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                          {isCorrect ? 'Mastered' : 'Needs Review'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Citation: {q.citation}</div>
                                      </div>
                                      <p className="text-slate-700 text-sm font-medium leading-relaxed">{q.explanation}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[60%] text-slate-400">
                          <p className="font-bold">No questions found.</p>
                          <p className="text-sm">Upload notes to start your quiz session.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          )}
        </div>
      </main>
      
      <footer className="w-full py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-t bg-white">
        Built with ❤️ for Students by Pustak Team
      </footer>
    </div>
  );
};

export default App;
