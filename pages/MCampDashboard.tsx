
import * as React from 'react';
import { User, AppRoute, QuizSession } from '../types';
import { DashboardLayout } from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { Lock, PlayCircle, FileText, CheckCircle, Clock, Trophy, AlertCircle, Zap, Check, ChevronRight, ChevronDown, Calendar, Users, MessageCircle } from 'lucide-react';
import { api } from '../services/api';
import { QuizEngine, QuizIntro } from '../components/QuizEngine';
import { useSettings } from '../context/SettingsContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface MCampDashboardProps {
    onLogout?: () => void;
    onUpdateUser?: (data: Partial<User>) => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
    onClearNotification: (id: string) => void;
    onClearAll: () => void;
    onDeleteAccount: () => void;
}


export const MCampDashboard: React.FC<MCampDashboardProps> = ({
    user,
    onLogout,
    onUpdateUser,
    notifications,
    onMarkAllRead,
    onClearNotification,
    onClearAll,
    onDeleteAccount
}) => {
    const navigate = useNavigate();
    const { mcampLive } = useSettings();
    const [currentDay, setCurrentDay] = React.useState(1);
    const [progress, setProgress] = React.useState(0);
    const [localUser, setLocalUser] = React.useState(user);

    // Sync local user state with prop
    React.useEffect(() => { setLocalUser(user); }, [user]);

    // Real-time listener for user updates (specifically for grading results)
    React.useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setLocalUser({ ...user, ...doc.data() });
            }
        });
        return () => unsub();
    }, [user?.uid]);

    // Data State
    const [weeks, setWeeks] = React.useState<any[]>([]);
    const [allResources, setAllResources] = React.useState<any[]>([]);
    const [expandedWeekId, setExpandedWeekId] = React.useState<number | null>(null);

    // Quiz State
    const [quizMode, setQuizMode] = React.useState<'idle' | 'intro' | 'active' | 'completed'>('idle');
    const [activeQuiz, setActiveQuiz] = React.useState<QuizSession | null>(null);

    React.useEffect(() => {
        if (user.mcamp?.startDate) {
            const start = new Date(user.mcamp.startDate);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setCurrentDay(diffDays > 90 ? 90 : diffDays);
            setProgress(Math.min(100, Math.round((diffDays / 90) * 100)));

            // Auto expand current week
            const currentWeek = Math.ceil(diffDays / 7);
            setExpandedWeekId(currentWeek);
        } else {
            setCurrentDay(1);
            setExpandedWeekId(1);
        }
    }, [user]);

    // Fetch Curriculum & Resources
    React.useEffect(() => {
        let unsubscribeCurriculum: (() => void) | undefined;

        const fetchData = async () => {
            // 1. Resources
            try {
                const resData = await api.resources.getAll();
                setAllResources(Array.isArray(resData) ? resData : []);
            } catch (e) {
                console.error("Failed resources", e);
            }

            // 2. Curriculum (Real-time)
            try {
                unsubscribeCurriculum = onSnapshot(doc(db, 'mcamp', 'curriculum'), (snap) => {
                    if (snap.exists()) {
                        setWeeks(snap.data().weeks || []);
                    }
                }, (error) => {
                    console.error("Failed curriculum snapshot", error);
                });
            } catch (e) {
                console.error("Failed curriculum setup", e);
            }
        };
        fetchData();

        return () => {
            if (unsubscribeCurriculum) unsubscribeCurriculum();
        };
    }, []);

    // Determine Active Weekly Quiz
    React.useEffect(() => {
        if (allResources.length > 0) {
            const currentWeek = Math.ceil(currentDay / 7);
            // Search for quiz manually tagged for this week OR implicitly
            // We look for 'Quiz' type, 'MCAMP' tag, and matching weekNumber property
            const found = allResources.find((r: any) =>
                r.type === 'Quiz' &&
                (r.tags?.includes('MCAMP') || r.isMcampExclusive) &&
                Number(r.weekNumber) === currentWeek
            );

            if (found) {
                // Ensure ID is set properly for the quiz engine
                setActiveQuiz({
                    ...found,
                    id: found.id || found._id
                });
            } else {
                setActiveQuiz(null);
            }
        }
    }, [allResources, currentDay]);

    const handleQuizFinish = (answers: Record<string, any>) => {
        if (onUpdateUser && activeQuiz) {
            const newAttempts = {
                ...(user.quizAttempts || {}),
                [activeQuiz.id]: {
                    status: 'pending_grading' as const,
                    submittedAt: new Date().toISOString()
                }
            };
            onUpdateUser({ quizAttempts: newAttempts });
        }
        setQuizMode('completed');
        setTimeout(() => setQuizMode('idle'), 3000);
    };

    // Helper to get resource details
    const getResource = (id: string) => allResources.find(r => r.id === id || r._id === id);

    return (
        <DashboardLayout
            user={user}
            onLogout={onLogout}
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onClearNotification={onClearNotification}
            onClearAll={onClearAll}
            onDeleteAccount={onDeleteAccount}
        >
            <div className="max-w-7xl mx-auto animate-fade-in-up">

                {/* QUIZ OVERLAYS */}
                {quizMode === 'intro' && activeQuiz && (
                    <QuizIntro
                        session={activeQuiz}
                        onStart={() => setQuizMode('active')}
                        onClose={() => setQuizMode('idle')}
                        user={user}
                    />
                )}

                {quizMode === 'active' && activeQuiz && (
                    <QuizEngine
                        session={activeQuiz}
                        onFinish={handleQuizFinish}
                        onCancel={() => setQuizMode('idle')}
                    />
                )}

                {quizMode === 'completed' && (
                    <div className="fixed inset-0 z-[120] bg-brand-dark/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white rounded-[3rem] p-8 sm:p-12 text-center shadow-2xl animate-pop-in max-w-sm">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check size={32} className="sm:w-10 sm:h-10" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mb-2">Submitted!</h2>
                            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">Your challenge answers were securely recorded. The admin will grade them shortly.</p>
                        </div>
                    </div>
                )}

                {/* MCAMP HEADER */}
                <div className="bg-brand-dark rounded-[2.5rem] p-8 md:p-12 mb-12 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                        <div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="inline-flex items-center gap-2 bg-brand-yellow/20 text-brand-yellow px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border border-brand-yellow/20">
                                    <Trophy size={14} /> Distinction Cohort
                                    {mcampLive && <span className="ml-2 bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">LIVE</span>}
                                </div>
                                {user.mcamp?.uniqueId && (
                                    <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border border-white/10">
                                        ID: <span className="text-white font-mono">{user.mcamp.uniqueId}</span>
                                    </div>
                                )}
                            </div>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                                Day {currentDay} <span className="text-gray-600 text-3xl">/ 90</span>
                            </h1>
                            <p className="text-gray-400 max-w-xl text-lg font-medium">
                                Current Phase: <span className="text-white">Week {Math.ceil(currentDay / 7)}</span>
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full md:w-auto min-w-[280px]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400 font-bold text-xs uppercase">Overall Mastery</span>
                                <span className="text-brand-yellow font-bold">{progress}%</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-yellow transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="mt-4 flex gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span>On Track</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weekly Modules Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Weekly Map */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                            <Calendar size={20} className="text-brand-blue" />
                            Curriculum Roadmap
                        </h3>

                        {weeks.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-[2rem] border border-gray-100 text-gray-400">
                                <div className="animate-pulse">Loading curriculum...</div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {weeks.map((week) => {
                                    // LOGIC: Unlocked if Time says so OR Admin explicitly unlocked it
                                    const weekStartDay = (Number(week.id) - 1) * 7 + 1;
                                    const isTimeUnlocked = currentDay >= weekStartDay;
                                    const isAdminUnlocked = !!week.isUnlocked;

                                    const isLocked = !(isTimeUnlocked || isAdminUnlocked);
                                    const isExpanded = expandedWeekId === week.id;

                                    return (
                                        <div key={week.id} className={`bg-white rounded-3xl overflow-hidden transition-all shadow-sm ${isLocked ? 'opacity-60 grayscale border border-gray-100' : 'border border-gray-200 hover:border-brand-blue/30'}`}>
                                            <div
                                                onClick={() => !isLocked && setExpandedWeekId(isExpanded ? null : week.id)}
                                                className={`p-5 flex justify-between items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${isLocked ? 'bg-gray-100 text-gray-400' : 'bg-brand-dark text-white shadow-lg shadow-brand-dark/30'}`}>
                                                        {week.id}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg text-brand-dark">{week.title}</h4>
                                                        <p className="text-sm text-gray-500 font-medium">
                                                            {isLocked
                                                                ? `Unlocks Day ${weekStartDay}`
                                                                : (isAdminUnlocked && !isTimeUnlocked ? 'Unlocked Early' : `${Object.values(week.days || {}).flat().length} Resources Available`)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isLocked ? (
                                                    <Lock size={20} className="text-gray-300" />
                                                ) : (
                                                    <div className={`p-2 rounded-full transition-transform ${isExpanded ? 'bg-gray-100 rotate-180' : ''}`}>
                                                        <ChevronDown size={20} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Day View */}
                                            {isExpanded && !isLocked && (
                                                <div className="border-t border-gray-100 bg-gray-50/50 p-6 space-y-6 animate-fade-in-down">
                                                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                                                        const resourceIds = week.days?.[day] || [];
                                                        if (resourceIds.length === 0) return null;

                                                        return (
                                                            <div key={day} className="relative pl-6 border-l-2 border-brand-blue/20">
                                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-blue/20 border-2 border-white"></div>
                                                                <h5 className="font-bold text-gray-900 mb-3 uppercase text-xs tracking-wider">Day {day}</h5>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {resourceIds.map((rid: string) => {
                                                                        const r = getResource(rid);
                                                                        if (!r) return null;
                                                                        return (
                                                                            <div
                                                                                key={r.id || r._id}
                                                                                onClick={() => navigate(`${AppRoute.LEARNING}/${r.id || r._id}`)}
                                                                                className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:border-brand-blue/50 hover:shadow-md transition-all cursor-pointer group"
                                                                            >
                                                                                <div className={`p-2.5 rounded-lg shrink-0 ${r.type === 'Quiz' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-brand-blue'}`}>
                                                                                    {r.type === 'Quiz' ? <Zap size={18} /> : (r.type === 'Video' ? <PlayCircle size={18} /> : <FileText size={18} />)}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <h6 className="font-bold text-brand-dark text-sm truncate group-hover:text-brand-blue transition-colors">{r.title}</h6>
                                                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">{r.subject}</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {Object.keys(week.days || {}).length === 0 && (
                                                        <div className="text-center italic text-gray-400 py-4">No resources assigned to this week yet.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Leaderboard & Stats */}
                    <div className="space-y-6">

                        {/* WhatsApp Community Card */}
                        <div className="bg-[#25D366] text-white p-6 rounded-[2.5rem] shadow-xl shadow-green-500/20 relative overflow-hidden group">
                            {/* Decorative bubbles */}
                            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                            <div className="absolute bottom-[-10px] left-[-10px] w-24 h-24 rounded-full bg-white/10 blur-xl"></div>

                            <h3 className="text-2xl font-extrabold mb-2 flex items-center gap-2 relative z-10">
                                <Users size={24} /> Join Community
                            </h3>
                            <p className="text-white/90 font-bold text-sm mb-6 leading-relaxed relative z-10">
                                Verify your ID to get added to the exclusive MCAMP WhatsApp Group.
                            </p>

                            <a
                                href={`https://wa.me/2347088262583?text=${encodeURIComponent(`Hello Admin, I have successfully enrolled in MCAMP. My Unique ID is ${localUser.mcamp?.uniqueId || 'PENDING'}. Please verify me and add me to the Community Group.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-white text-[#25D366] py-3.5 rounded-xl font-bold text-center hover:bg-gray-50 transition-colors shadow-lg relative z-10 flex items-center justify-center gap-2"
                            >
                                <span className="w-5 h-5 flex items-center justify-center bg-[#25D366] text-white rounded-full">
                                    <MessageCircle size={10} fill="currentColor" />
                                </span>
                                Verify on WhatsApp
                            </a>
                        </div>
                        {/* Weekly Challenge CTA */}
                        <div className="bg-gradient-to-br from-brand-yellow to-orange-400 p-8 rounded-[2.5rem] text-brand-dark shadow-lg group relative overflow-hidden">
                            <Trophy size={48} className="mb-6 opacity-40 absolute -right-4 -top-4 group-hover:scale-125 transition-transform" />
                            <div className="relative z-10">
                                <h3 className="font-extrabold text-2xl mb-2">Weekly Mastery</h3>
                                <p className="text-sm font-bold opacity-80 mb-8 leading-relaxed">
                                    {activeQuiz
                                        ? (localUser.quizAttempts?.[activeQuiz.id] ? "Submission received. Excellent discipline, Medic." : activeQuiz.description || "Test your knowledge for this week.")
                                        : "No active mastery challenge for this week yet."
                                    }
                                </p>
                                <button
                                    disabled={!activeQuiz}
                                    onClick={() => setQuizMode('intro')}
                                    className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-2 ${activeQuiz ? 'bg-brand-dark text-white hover:bg-black cursor-pointer' : 'bg-brand-dark/50 text-white/50 cursor-not-allowed'}`}
                                >
                                    {activeQuiz
                                        ? (localUser.quizAttempts?.[activeQuiz.id]
                                            ? (localUser.quizAttempts[activeQuiz.id].status === 'completed'
                                                ? "View Results"
                                                : "View Status")
                                            : "Start Quiz")
                                        : "Pending..."
                                    }
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Deadlines */}
                        <div className="bg-red-50 rounded-[2rem] p-6 border border-red-100">
                            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                                <AlertCircle size={20} />
                                Upcoming Deadlines
                            </h3>
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <p className="text-sm font-bold text-brand-dark">Week {Math.ceil(currentDay / 7)} Mastery Quiz</p>
                                <p className="text-xs text-red-500 font-bold mt-1">Due Sunday 11:59 PM</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};
