import React, { useState, useEffect } from 'react';
import { Upload, MessageSquare, BookOpen, BrainCircuit, Send, FileText, CheckCircle2, Loader2, LogOut, User, Lock, Trash2, PlusCircle, UserCircle, GraduationCap, School, Calendar, Target, RefreshCw, Save, ArrowRight, Stars, Sparkles, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument, chatWithDoc, getSummary, getMCQs, signupUser, loginUser, getDocuments, deleteDocument, getProfile, updateProfile } from './api/client';

const WOBBLY_RADIUS = "255px 15px 225px 15px / 15px 225px 15px 255px";
const WOBBLY_RADIUS_MD = "30px 10px 40px 15px / 15px 35px 20px 25px";

const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('pustak_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('pustak_user'));
  const [authMode, setAuthMode] = useState('login'); // login, signup
  const [showLanding, setShowLanding] = useState(!token);
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
      setShowLanding(false);
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
      alert('Profile saved! (Sketchy High Five! ✋)');
    } catch (err) {
      alert('Oops, something went wrong: ' + err.message);
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
        alert('Account Created! Now login and start sketching your future.');
        setAuthMode('login');
      } else {
        const data = await loginUser(authData.username, authData.password);
        setToken(data.token);
        setUsername(data.username);
        localStorage.setItem('pustak_token', data.token);
        localStorage.setItem('pustak_user', data.username);
        setShowLanding(false);
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
    setShowLanding(true);
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
      if (forceRefresh) setUserAnswers(prev => ({ ...prev, [id]: {} }));
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
        [docId]: [...(prev[docId] || []), { role: 'assistant', content: 'Sorry, my pen ran out of ink! (Server Error)' }]
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
    if (!confirm('Erase this sketch? It cannot be undone!')) return;
    
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

  // Landing / Home Page Component
  const LandingPage = () => (
    <div className="min-h-screen w-full flex flex-col bg-[#fdfbf7]">
      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto flex justify-between items-center p-8">
        <div className="flex items-center gap-2">
          <PenTool size={32} className="text-[#ff4d4d] -rotate-12" />
          <h1 className="text-4xl font-bold text-[#2d2d2d]">Pustak</h1>
        </div>
        <button 
          onClick={() => setShowLanding(false)}
          className="bg-white border-[3px] border-[#2d2d2d] px-8 py-3 font-bold hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sm transition-all"
          style={{ borderRadius: WOBBLY_RADIUS_MD }}
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <h2 className="text-6xl md:text-8xl leading-tight">Your AI <br/> <span className="text-[#ff4d4d] underline decoration-wavy decoration-[#2d2d2d]/20">Study Pad</span></h2>
          <p className="text-2xl text-[#2d2d2d]/80 leading-relaxed">
            Upload your messy PDF notes and let Pustak's AI brain summarize, quiz, and chat with you. It's like having a genius roommate who never sleeps.
          </p>
          <div className="flex gap-6 pt-4">
            <button 
              onClick={() => setShowLanding(false)}
              className="bg-[#ff4d4d] text-white border-[3px] border-[#2d2d2d] px-10 py-5 text-2xl font-bold hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sm transition-all flex items-center gap-3"
              style={{ borderRadius: WOBBLY_RADIUS }}
            >
              Get Started <ArrowRight />
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          className="relative"
        >
          <div className="bg-white border-[3px] border-[#2d2d2d] p-8 hard-shadow-lg rotate-2" style={{ borderRadius: WOBBLY_RADIUS }}>
             <div className="space-y-6">
                <div className="flex items-center gap-4 border-b-2 border-dashed border-[#2d2d2d]/20 pb-4">
                   <div className="w-12 h-12 bg-[#fff9c4] border-2 border-[#2d2d2d] rounded-full flex items-center justify-center">
                      <Sparkles className="text-[#ff4d4d]" />
                   </div>
                   <div className="flex-1 h-4 bg-[#e5e0d8] rounded-full w-[60%]" />
                </div>
                <div className="space-y-3">
                   <div className="h-4 bg-[#e5e0d8] rounded-full w-full" />
                   <div className="h-4 bg-[#e5e0d8] rounded-full w-[90%]" />
                   <div className="h-4 bg-[#e5e0d8] rounded-full w-[95%]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="h-20 bg-[#fdfbf7] border-2 border-[#2d2d2d] hard-shadow-sm flex items-center justify-center font-bold" style={{ borderRadius: WOBBLY_RADIUS_MD }}>Summary</div>
                   <div className="h-20 bg-[#fdfbf7] border-2 border-[#2d2d2d] hard-shadow-sm flex items-center justify-center font-bold" style={{ borderRadius: WOBBLY_RADIUS_MD }}>Quiz</div>
                </div>
             </div>
          </div>
          {/* Decorative sticky note */}
          <div className="absolute -top-6 -right-6 bg-[#fff9c4] border-2 border-[#2d2d2d] p-4 rotate-12 hard-shadow-sm" style={{ borderRadius: '5px' }}>
             <p className="font-bold text-sm">#StudyHarder</p>
          </div>
        </motion.div>
      </main>

      <footer className="w-full text-center p-12 border-t-2 border-dashed border-[#2d2d2d]/20">
         <p className="font-bold text-[#2d2d2d]/40 uppercase tracking-widest">Built with ink and pixels by Pustak Team</p>
      </footer>
    </div>
  );

  if (showLanding) return <LandingPage />;

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#fdfbf7]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 border-[3px] border-[#2d2d2d] hard-shadow-lg max-w-md w-full relative"
          style={{ borderRadius: WOBBLY_RADIUS }}
        >
          {/* Tape Decoration */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-10 bg-[#2d2d2d]/10 border-2 border-dashed border-[#2d2d2d]/20 rotate-1" />

          <div className="flex flex-col items-center mb-8">
            <div className="bg-[#ff4d4d] p-4 border-[3px] border-[#2d2d2d] text-white mb-4 -rotate-6" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
              <BrainCircuit size={32} />
            </div>
            <h2 className="text-4xl font-bold text-[#2d2d2d]">{authMode === 'login' ? 'Welcome Back!' : 'Join Pustak'}</h2>
            <p className="text-[#2d2d2d]/60 mt-2">{authMode === 'login' ? 'Grab your pencil and log in.' : 'Create an account to start studying.'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-lg font-bold text-[#2d2d2d] ml-1">Who are you?</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d2d2d]/40" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Username"
                  className="w-full bg-[#fdfbf7] border-[3px] border-[#2d2d2d] py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none transition-all"
                  style={{ borderRadius: WOBBLY_RADIUS_MD }}
                  value={authData.username}
                  onChange={(e) => setAuthData({...authData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-bold text-[#2d2d2d] ml-1">The Secret Code</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d2d2d]/40" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="Password"
                  className="w-full bg-[#fdfbf7] border-[3px] border-[#2d2d2d] py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none transition-all"
                  style={{ borderRadius: WOBBLY_RADIUS_MD }}
                  value={authData.password}
                  onChange={(e) => setAuthData({...authData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-[#ff4d4d] text-white py-5 border-[3px] border-[#2d2d2d] font-bold text-2xl hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sm transition-all disabled:opacity-50 mt-4"
              style={{ borderRadius: WOBBLY_RADIUS_MD }}
            >
              {authLoading ? <Loader2 className="animate-spin mx-auto" /> : (authMode === 'login' ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-[#ff4d4d] font-bold text-lg hover:underline decoration-wavy decoration-[#ff4d4d]/30"
            >
              {authMode === 'login' ? "New here? Grab a desk (Sign Up)" : "Already have a desk? (Log In)"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#fdfbf7] p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-7xl flex justify-between items-center mb-8 p-6 bg-white border-[3px] border-[#2d2d2d] hard-shadow" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowLanding(true)}>
          <div className="bg-[#ff4d4d] p-2 border-[2px] border-[#2d2d2d] text-white -rotate-12">
            <PenTool size={24} />
          </div>
          <h1 className="text-3xl font-bold text-[#2d2d2d]">Pustak</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-2 border-[2px] border-[#2d2d2d] transition-all ${activeTab === 'profile' ? 'bg-[#ff4d4d] text-white hard-shadow-sm -translate-x-[1px] -translate-y-[1px]' : 'bg-white text-[#2d2d2d] hover:bg-[#fdfbf7]'}`}
            style={{ borderRadius: WOBBLY_RADIUS_MD }}
          >
            <UserCircle size={20} />
            <span className="font-bold">{profile.full_name || username}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="text-[#2d2d2d]/40 hover:text-[#ff4d4d] transition-colors p-2"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="bg-white border-[3px] border-[#2d2d2d] hard-shadow p-8 flex flex-col h-[calc(100vh-180px)] sticky top-8" style={{ borderRadius: WOBBLY_RADIUS }}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-[#2d2d2d]">Notebooks</h3>
            <label className="cursor-pointer bg-[#fff9c4] border-[2px] border-[#2d2d2d] p-2 hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-sm" style={{ borderRadius: '8px' }}>
              <PlusCircle size={24} />
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {isUploading && (
              <div className="p-4 bg-[#e5e0d8] border-[2px] border-[#2d2d2d] border-dashed flex items-center gap-3" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="font-bold text-sm">Writing notes...</span>
              </div>
            )}
            
            {documents.length === 0 && !isUploading ? (
              <div className="text-center py-12 opacity-20 rotate-3">
                <PenTool size={64} className="mx-auto mb-4" />
                <p className="font-bold text-lg">Your shelf is empty</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div 
                  key={doc.doc_id}
                  onClick={() => handleSelectDocument(doc.doc_id, doc.file_name)}
                  className={`group relative p-5 border-[3px] border-[#2d2d2d] transition-all cursor-pointer ${docId === doc.doc_id && activeTab !== 'profile' ? 'bg-[#ff4d4d] text-white hard-shadow-sm -translate-x-[2px] -translate-y-[2px]' : 'bg-white text-[#2d2d2d] hover:rotate-1'}`}
                  style={{ borderRadius: WOBBLY_RADIUS_MD }}
                >
                  <div className="flex items-center gap-4">
                    <FileText size={20} className={docId === doc.doc_id && activeTab !== 'profile' ? 'text-white' : 'text-[#ff4d4d]'} />
                    <span className="font-bold truncate pr-6 text-lg">{doc.file_name}</span>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteDocument(e, doc.doc_id)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 transition-all ${docId === doc.doc_id && activeTab !== 'profile' ? 'hover:bg-white/20 text-white' : 'opacity-0 group-hover:opacity-100 text-[#ff4d4d]'}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex flex-col gap-8">
          {activeTab === 'profile' ? (
            <motion.div 
              initial={{ opacity: 0, rotate: 1 }}
              animate={{ opacity: 1, rotate: 0 }}
              className="bg-white border-[3px] border-[#2d2d2d] hard-shadow p-12 flex-col flex-1"
              style={{ borderRadius: WOBBLY_RADIUS }}
            >
              <div className="flex items-center gap-6 mb-12">
                <div className="bg-[#fff9c4] p-4 border-[3px] border-[#2d2d2d] rotate-6">
                  <UserCircle className="text-[#2d2d2d]" size={48} />
                </div>
                <div>
                  <h2 className="text-5xl font-bold text-[#2d2d2d]">My Desk</h2>
                  <p className="text-xl text-[#2d2d2d]/60">Student credentials & goals</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xl font-bold text-[#2d2d2d] ml-1">Real Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Rajat Tiwari"
                        className="w-full bg-[#fdfbf7] border-[3px] border-[#2d2d2d] py-4 px-6 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none"
                        style={{ borderRadius: WOBBLY_RADIUS_MD }}
                        value={profile.full_name}
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xl font-bold text-[#2d2d2d] ml-1">The High School / Uni</label>
                      <input 
                        type="text" 
                        placeholder="Where do you learn?"
                        className="w-full bg-[#fdfbf7] border-[3px] border-[#2d2d2d] py-4 px-6 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none"
                        style={{ borderRadius: WOBBLY_RADIUS_MD }}
                        value={profile.college}
                        onChange={(e) => setProfile({...profile, college: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xl font-bold text-[#2d2d2d] ml-1">Current Year</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Final Year"
                        className="w-full bg-[#fdfbf7] border-[3px] border-[#2d2d2d] py-4 px-6 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none"
                        style={{ borderRadius: WOBBLY_RADIUS_MD }}
                        value={profile.year}
                        onChange={(e) => setProfile({...profile, year: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="flex items-center justify-center gap-3 w-full bg-[#2d5da1] text-white py-5 border-[3px] border-[#2d2d2d] font-bold text-2xl hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sm transition-all disabled:opacity-50"
                    style={{ borderRadius: WOBBLY_RADIUS_MD }}
                  >
                    {isSavingProfile ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Save My Stats</>}
                  </button>
                </form>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xl font-bold text-[#2d2d2d] ml-1 flex items-center gap-2">
                      <Target size={24} className="text-[#ff4d4d]" />
                      Grand Ambitions (Goals)
                    </label>
                    <textarea 
                      placeholder="Write your dreams here..."
                      rows={6}
                      className="w-full bg-[#fff9c4] border-[3px] border-[#2d2d2d] p-8 focus:ring-2 focus:ring-[#ff4d4d]/20 outline-none text-[#2d2d2d] font-bold text-xl resize-none -rotate-1"
                      style={{ borderRadius: '15px' }}
                      value={profile.goals}
                      onChange={(e) => setProfile({...profile, goals: e.target.value})}
                    />
                  </div>
                  <div className="p-8 bg-[#e5e0d8] border-[3px] border-[#2d2d2d] border-dashed rotate-1" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                    <h4 className="text-2xl font-bold text-[#2d2d2d] mb-4">Sketch Pad Tip 📝</h4>
                    <p className="text-lg text-[#2d2d2d]/70 leading-relaxed italic">"The pen is mightier than the sword, but a clean UI is mightier than a messy textbook." — Pustak AI</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !docId ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-[3px] border-[#2d2d2d] hard-shadow p-16 flex-1 flex flex-col items-center justify-center text-center"
              style={{ borderRadius: WOBBLY_RADIUS }}
            >
              <div className="max-w-xl space-y-10">
                <div className="bg-[#ff4d4d] w-24 h-24 border-[3px] border-[#2d2d2d] rounded-full flex items-center justify-center mx-auto -rotate-12">
                  <BookOpen className="text-white" size={48} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-bold text-[#2d2d2d]">Welcome Back, <span className="text-[#ff4d4d]">{profile.full_name || username}!</span></h2>
                  <p className="text-2xl text-[#2d2d2d]/60 font-medium leading-relaxed">Your desk is ready. Pick a notebook from the sidebar or drop a new PDF to start sketching out your success.</p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-4 bg-[#ff4d4d] text-white px-10 py-5 border-[3px] border-[#2d2d2d] text-2xl font-bold hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sm transition-all" style={{ borderRadius: WOBBLY_RADIUS }}>
                  <Upload size={28} />
                  <span>New Notebook</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Tab Navigation */}
              <div className="bg-white p-3 border-[3px] border-[#2d2d2d] hard-shadow flex flex-wrap items-center justify-between gap-4" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { id: 'summary', icon: BookOpen, label: 'Summary' },
                    { id: 'chat', icon: MessageSquare, label: 'Ask AI' },
                    { id: 'mcqs', icon: CheckCircle2, label: 'Quiz Time' }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); if (tab.id === 'mcqs') fetchMCQs(docId); }}
                      className={`flex items-center gap-3 px-8 py-3 font-bold text-xl transition-all border-[2px] ${activeTab === tab.id ? 'bg-[#ff4d4d] text-white border-[#2d2d2d] hard-shadow-sm -translate-x-[1px] -translate-y-[1px]' : 'text-[#2d2d2d]/50 hover:bg-[#fdfbf7] border-transparent'}`}
                      style={{ borderRadius: WOBBLY_RADIUS_MD }}
                    >
                      <tab.icon size={20} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="px-8 border-l-2 border-dashed border-[#2d2d2d]/20 hidden xl:block max-w-[300px]">
                   <p className="text-xs font-bold text-[#2d2d2d]/30 uppercase tracking-widest mb-1">Open Sketchbook</p>
                   <p className="text-lg font-bold text-[#2d2d2d] truncate italic">"{fileName}"</p>
                </div>
              </div>

              {/* Main Content Area */}
              <section className="bg-white border-[3px] border-[#2d2d2d] hard-shadow h-[calc(100vh-280px)] flex flex-col overflow-hidden relative" style={{ borderRadius: WOBBLY_RADIUS }}>
                {/* Paper Lines Background Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#2d2d2d 1px, transparent 1px)', backgroundSize: '100% 2.5rem' }} />
                
                <AnimatePresence mode="wait">
                  {activeTab === 'chat' && (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full p-10 z-10"
                    >
                      <div className="flex-1 space-y-8 mb-8 overflow-y-auto pr-4 custom-scrollbar">
                        {(messages[docId] || []).length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-[#2d2d2d]/20 gap-6">
                            <PenTool size={96} className="-rotate-12" />
                            <p className="text-3xl font-bold">What's on your mind about this notebook?</p>
                          </div>
                        )}
                        {(messages[docId] || []).map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-6 border-[3px] border-[#2d2d2d] hard-shadow-sm ${msg.role === 'user' ? 'bg-[#2d5da1] text-white rotate-1' : 'bg-[#fdfbf7] text-[#2d2d2d] -rotate-1'}`} style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} className={`prose max-w-none prose-p:leading-relaxed prose-p:text-xl prose-p:font-bold ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                                {msg.content}
                              </ReactMarkdown>
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t-2 border-dashed border-black/10">
                                  {msg.citations.map((cite, idx) => (
                                    <span key={idx} className="text-xs uppercase font-bold tracking-wider bg-black/5 px-3 py-1 border border-black/10 rounded-md">
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
                            <div className="bg-[#fdfbf7] border-[3px] border-[#2d2d2d] p-6 hard-shadow-sm -rotate-1" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                              <Loader2 className="animate-spin text-[#ff4d4d]" size={28} />
                            </div>
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleSendMessage} className="flex gap-4 bg-[#fdfbf7] p-4 border-[3px] border-[#2d2d2d] hard-shadow-sm" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                        <input 
                          type="text" 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask a sketchy question..."
                          className="flex-1 bg-transparent px-4 py-2 outline-none text-[#2d2d2d] font-bold text-xl"
                        />
                        <button type="submit" disabled={isTyping || !input.trim()} className="bg-[#ff4d4d] text-white p-4 border-[2px] border-[#2d2d2d] hard-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50">
                          <Send size={24} />
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
                      className="p-12 overflow-y-auto h-full custom-scrollbar z-10"
                    >
                      <div className="flex items-center gap-6 mb-12">
                        <div className="bg-[#fff9c4] p-4 border-[3px] border-[#2d2d2d] -rotate-6">
                          <Stars className="text-[#2d2d2d]" size={32} />
                        </div>
                        <h2 className="text-5xl font-bold text-[#2d2d2d]">The Big Picture</h2>
                      </div>
                      {isLoadingContent && !summaries[docId] ? (
                        <div className="flex flex-col items-center justify-center h-[60%] gap-6 text-[#2d2d2d]/30">
                          <Loader2 className="animate-spin" size={64} />
                          <p className="text-2xl font-bold animate-pulse italic">Squinting at the text...</p>
                        </div>
                      ) : (
                        <div className="bg-white border-[3px] border-[#2d2d2d] p-10 hard-shadow-lg rotate-1" style={{ borderRadius: WOBBLY_RADIUS_MD }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-xl prose-p:font-bold prose-headings:font-bold prose-headings:text-[#2d2d2d] prose-li:my-2 prose-table:border-2 prose-table:border-[#2d2d2d]">
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
                      className="p-12 overflow-y-auto h-full custom-scrollbar z-10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-6">
                          <div className="bg-[#fff9c4] p-4 border-[3px] border-[#2d2d2d] rotate-12">
                            <CheckCircle2 className="text-[#2d2d2d]" size={32} />
                          </div>
                          <h2 className="text-5xl font-bold text-[#2d2d2d]">The Trial</h2>
                        </div>
                        <button 
                          onClick={() => fetchMCQs(docId, true)}
                          disabled={isLoadingContent}
                          className="flex items-center gap-3 bg-[#e5e0d8] text-[#2d2d2d] px-8 py-4 border-[3px] border-[#2d2d2d] font-bold text-xl hard-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50"
                          style={{ borderRadius: WOBBLY_RADIUS_MD }}
                        >
                          {isLoadingContent ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                          <span>Shuffle Questions</span>
                        </button>
                      </div>

                      {isLoadingContent && (!allMcqs[docId] || allMcqs[docId].length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-[60%] gap-6 text-[#2d2d2d]/30">
                          <Loader2 className="animate-spin" size={64} />
                          <p className="text-2xl font-bold animate-pulse italic">Sharpening pencils...</p>
                        </div>
                      ) : allMcqs[docId] && allMcqs[docId].length > 0 ? (
                        <div className="space-y-12 pb-16">
                          {allMcqs[docId].map((q, idx) => {
                            const answers = userAnswers[docId] || {};
                            const isAnswered = answers[idx] !== undefined;
                            const selectedOption = answers[idx];
                            const isCorrect = selectedOption === (q.correct_answer || q.answer);

                            return (
                              <div key={idx} className="bg-white p-10 border-[3px] border-[#2d2d2d] hard-shadow hover:rotate-1 transition-transform" style={{ borderRadius: WOBBLY_RADIUS }}>
                                <div className="flex items-start gap-6">
                                  <span className="bg-[#ff4d4d] text-white font-bold px-4 py-2 border-[2px] border-[#2d2d2d] text-xl -rotate-12">{idx + 1}</span>
                                  <p className="text-3xl font-bold text-[#2d2d2d] leading-tight">{q.question || q.Question}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 ml-16">
                                  {(q.options || q.Options || []).map((opt, i) => {
                                    let buttonStyle = "bg-[#fdfbf7] border-[#2d2d2d] text-[#2d2d2d]";
                                    if (isAnswered) {
                                      if (opt === (q.correct_answer || q.answer)) {
                                        buttonStyle = "bg-green-100 border-green-600 text-green-800 hard-shadow-sm -translate-x-[1px] -translate-y-[1px]";
                                      } else if (opt === selectedOption && !isCorrect) {
                                        buttonStyle = "bg-red-100 border-red-600 text-red-800 hard-shadow-sm -translate-x-[1px] -translate-y-[1px]";
                                      } else {
                                        buttonStyle = "bg-[#fdfbf7] border-[#2d2d2d]/20 text-[#2d2d2d]/20";
                                      }
                                    } else {
                                      buttonStyle = "hover:bg-[#fff9c4] hover:border-[#ff4d4d] transition-all cursor-pointer";
                                    }

                                    return (
                                      <button 
                                        key={i} 
                                        disabled={isAnswered}
                                        onClick={() => handleOptionClick(idx, opt)}
                                        className={`text-left p-6 border-[3px] font-bold text-xl transition-all ${buttonStyle}`}
                                        style={{ borderRadius: WOBBLY_RADIUS_MD }}
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
                                      className={`mt-10 ml-16 p-8 border-[3px] border-dashed ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}
                                      style={{ borderRadius: WOBBLY_RADIUS_MD }}
                                    >
                                      <div className="flex flex-wrap items-center gap-4 mb-4">
                                        <div className={`px-4 py-1 border-[2px] border-[#2d2d2d] text-sm font-bold uppercase tracking-widest ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                          {isCorrect ? 'GENIUS! ✨' : 'NOT QUITE... ✍️'}
                                        </div>
                                        <div className="text-xs text-[#2d2d2d]/40 font-bold uppercase tracking-widest italic">Source: {q.citation}</div>
                                      </div>
                                      <p className="text-[#2d2d2d] text-xl font-bold leading-relaxed">{q.explanation}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[60%] text-[#2d2d2d]/30">
                          <p className="text-3xl font-bold italic">No doodles here yet.</p>
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
      
      <footer className="w-full py-12 text-center text-[#2d2d2d]/20 text-sm font-bold uppercase tracking-[0.3em] border-t-2 border-dashed border-[#2d2d2d]/10 mt-12">
        Pustak Study Pad — Hand-Drawn with Love for Students
      </footer>
    </div>
  );
};

export default App;
