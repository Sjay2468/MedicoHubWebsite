import * as React from 'react';
import { QuizSession, User } from '../types';
import {
    Brain, Timer, Check, ChevronLeft, ChevronRight, HelpCircle, X,
    Trophy, Clock, BookOpen, Shield, AlertCircle, ArrowRight, CheckCircle
} from 'lucide-react';

export const QuizEngine: React.FC<{
    session: QuizSession;
    onFinish: (answers: Record<string, any>) => void;
    onCancel: () => void;
}> = ({ session, onFinish, onCancel }) => {
    const [currentIdx, setCurrentIdx] = React.useState(0);
    const [answers, setAnswers] = React.useState<Record<string, any>>({});
    const [timeLeft, setTimeLeft] = React.useState(session.durationMinutes * 60);
    const [showConfirmSubmit, setShowConfirmSubmit] = React.useState(false);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onFinish(answers);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [answers, onFinish]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentQuestion = session.questions[currentIdx];

    const handleAnswerChange = (val: any) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    const isAnswered = (id: string) => answers[id] !== undefined && answers[id] !== '';

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden animate-fade-in">
            {/* Quiz Header */}
            <header className="bg-brand-dark text-white px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shrink-0 shadow-lg">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    <div className="bg-brand-blue p-2 rounded-xl shrink-0">
                        <Brain size={18} className="md:w-5 md:h-5" />
                    </div>
                    <div className="truncate">
                        <h2 className="font-bold text-xs md:text-sm truncate">{session.title}</h2>
                        <p className="text-[10px] text-gray-400">Week {session.weekNumber} Mastery</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <div className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-mono font-bold text-sm md:text-lg ${timeLeft < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-brand-yellow'}`}>
                        <Timer size={16} className="md:w-5 md:h-5" />
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="bg-brand-blue hover:bg-blue-600 text-white px-3 md:px-6 py-1.5 md:py-2 rounded-xl font-bold text-[10px] md:text-sm transition-all shadow-lg shadow-brand-blue/20 shrink-0"
                    >
                        Submit
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Navigation Sidebar (Desktop Only) */}
                <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col p-6 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Question Navigator</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {session.questions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIdx(i)}
                                className={`w-12 h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${currentIdx === i
                                    ? 'bg-brand-blue text-white shadow-lg ring-2 ring-brand-blue ring-offset-2'
                                    : isAnswered(q.id)
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <div className="w-3 h-3 bg-brand-blue rounded-sm"></div> Current
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <div className="w-3 h-3 bg-green-100 rounded-sm"></div> Answered
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div> Unanswered
                        </div>
                    </div>
                </aside>

                {/* Question Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 bg-gray-50/50">
                    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] md:text-sm font-bold text-brand-blue uppercase tracking-widest">Question {currentIdx + 1} of {session.questions.length}</span>
                            <span className="text-[10px] font-medium text-gray-400">{currentQuestion.type}</span>
                        </div>

                        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
                            <h1 className="text-lg md:text-2xl font-bold text-brand-dark leading-relaxed mb-6 md:mb-10">
                                {currentQuestion.prompt}
                            </h1>

                            {currentQuestion.imageUrl && (
                                <div className="mb-6 md:mb-10 rounded-2xl overflow-hidden border border-gray-100">
                                    <img src={currentQuestion.imageUrl} alt="Question Reference" className="w-full h-auto object-cover max-h-[300px]" />
                                </div>
                            )}

                            <div className="space-y-3 md:space-y-4">
                                {(currentQuestion.type === 'SBO' || !currentQuestion.type) && currentQuestion.options?.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswerChange(i)}
                                        className={`w-full text-left p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-4 group ${answers[currentQuestion.id] === i
                                            ? 'border-brand-blue bg-blue-50/50'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 transition-colors ${answers[currentQuestion.id] === i ? 'bg-brand-blue border-brand-blue text-white' : 'border-gray-200 text-gray-400 group-hover:border-brand-blue'
                                            }`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className={`text-sm md:text-base font-medium ${answers[currentQuestion.id] === i ? 'text-brand-dark' : 'text-gray-600'}`}>{opt}</span>
                                    </button>
                                ))}

                                {currentQuestion.type === 'MCQ' && currentQuestion.options?.map((opt, i) => {
                                    const currentAnswers = (answers[currentQuestion.id] as number[]) || [];
                                    const isChecked = currentAnswers.includes(i);
                                    const toggle = () => {
                                        const next = isChecked ? currentAnswers.filter(a => a !== i) : [...currentAnswers, i];
                                        handleAnswerChange(next);
                                    };
                                    return (
                                        <button
                                            key={i}
                                            onClick={toggle}
                                            className={`w-full text-left p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-4 group ${isChecked
                                                ? 'border-brand-blue bg-blue-50/50'
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-brand-blue border-brand-blue text-white' : 'border-gray-200 group-hover:border-brand-blue'
                                                }`}>
                                                {isChecked && <Check size={12} className="md:w-3.5 md:h-3.5" />}
                                            </div>
                                            <span className={`text-sm md:text-base font-medium ${isChecked ? 'text-brand-dark' : 'text-gray-600'}`}>{opt}</span>
                                        </button>
                                    );
                                })}

                                {(currentQuestion.type === 'FIB' || currentQuestion.type === 'FILL_GAP' || currentQuestion.type === 'IMAGE_ID') && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Type your answer here..."
                                            value={answers[currentQuestion.id] || ''}
                                            onChange={(e) => handleAnswerChange(e.target.value)}
                                            className="w-full p-4 md:p-5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl focus:bg-white focus:border-brand-blue outline-none transition-all font-bold text-brand-dark text-sm md:text-base"
                                        />
                                    </div>
                                )}

                                {currentQuestion.type === 'MFIB' && (
                                    <div className="space-y-3">
                                        {(Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer : []).map((_: any, i: number) => (
                                            <div key={i} className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 opacity-50">#{i + 1}</span>
                                                <input
                                                    type="text"
                                                    placeholder="Type answer here..."
                                                    value={(answers[currentQuestion.id] || [])[i] || ''}
                                                    onChange={(e) => {
                                                        const current = Array.isArray(answers[currentQuestion.id]) ? [...answers[currentQuestion.id]] : [];
                                                        const next = [...current];
                                                        next[i] = e.target.value;
                                                        handleAnswerChange(next);
                                                    }}
                                                    className="w-full pl-12 pr-4 py-4 md:py-5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl focus:bg-white focus:border-brand-blue outline-none transition-all font-bold text-brand-dark text-sm md:text-base"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.type === 'ESSAY' && (
                                    <div className="relative">
                                        <textarea
                                            placeholder="Type your detailed explanation here..."
                                            value={answers[currentQuestion.id] || ''}
                                            onChange={(e) => handleAnswerChange(e.target.value)}
                                            className="w-full p-4 md:p-5 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl focus:bg-white focus:border-brand-blue outline-none transition-all font-medium text-brand-dark min-h-[150px] md:min-h-[200px] resize-none text-sm md:text-base"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex justify-between items-center pb-12 gap-4">
                            <button
                                disabled={currentIdx === 0}
                                onClick={() => setCurrentIdx(currentIdx - 1)}
                                className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-gray-500 hover:text-brand-dark disabled:opacity-0 transition-all text-xs md:text-sm"
                            >
                                <ChevronLeft size={16} className="md:w-5 md:h-5" /> Previous
                            </button>

                            <button
                                onClick={() => {
                                    if (currentIdx === session.questions.length - 1) {
                                        setShowConfirmSubmit(true);
                                    } else {
                                        setCurrentIdx(currentIdx + 1);
                                    }
                                }}
                                className={`flex items-center gap-1.5 md:gap-2 px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-white transition-all shadow-xl active:scale-95 text-xs md:text-sm ${currentIdx === session.questions.length - 1
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                                    : 'bg-brand-dark hover:bg-black shadow-brand-dark/20'
                                    }`}
                            >
                                {currentIdx === session.questions.length - 1 ? 'Finish' : 'Next Question'}
                                {currentIdx !== session.questions.length - 1 && <ChevronRight size={16} className="md:w-5 md:h-5" />}
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Confirmation Modal */}
            {showConfirmSubmit && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-sm animate-pop-in">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-sm w-full text-center shadow-2xl relative">
                        <button
                            onClick={() => setShowConfirmSubmit(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-brand-blue rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8">
                            <HelpCircle size={32} className="md:w-10 md:h-10" />
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-brand-dark mb-3 md:mb-4">Finish Attempt?</h3>
                        <p className="text-xs md:text-sm text-gray-500 mb-8 md:mb-10 leading-relaxed">
                            Are you sure you want to submit? You have {session.questions.length - Object.keys(answers).length} unanswered questions.
                        </p>

                        <div className="flex flex-col gap-2 md:gap-3">
                            <button
                                onClick={() => onFinish(answers)}
                                className="w-full bg-brand-blue text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-extrabold text-sm md:text-lg hover:bg-blue-600 transition-all shadow-lg shadow-brand-blue/30"
                            >
                                Yes, Submit Now
                            </button>
                            <button
                                onClick={() => setShowConfirmSubmit(false)}
                                className="w-full bg-gray-50 text-gray-500 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm md:text-base"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const QuizIntro: React.FC<{
    session: QuizSession;
    onStart: () => void;
    onClose: () => void;
    user: User;
}> = ({ session, onStart, onClose, user }) => {

    const hasAttempted = !!user.quizAttempts?.[session.id];
    const attempt = user.quizAttempts?.[session.id];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-sm animate-pop-in">
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-hide">
                <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-brand-blue/5 rounded-full -translate-y-12 translate-x-12"></div>

                <button onClick={onClose} className="absolute top-6 sm:top-8 right-6 sm:top-8 text-gray-400 hover:text-gray-600 transition-colors z-20">
                    <X size={24} />
                </button>

                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 mb-6 sm:mb-8">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-yellow/20 text-brand-yellow rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                            <Trophy size={28} className="sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-3xl font-extrabold text-brand-dark leading-tight">{session.title}</h2>
                            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mt-1">Week {session.weekNumber} Mastery Challenge</p>
                        </div>
                    </div>

                    {hasAttempted ? (
                        <div className={`border rounded-3xl p-6 sm:p-8 text-center mb-6 sm:mb-8 animate-fade-in ${attempt!.status === 'completed'
                            ? 'bg-green-50 border-green-100'
                            : 'bg-blue-50 border-blue-100'
                            }`}>
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${attempt!.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-brand-blue'
                                }`}>
                                {attempt!.status === 'completed' ? <Trophy size={20} className="sm:w-6 sm:h-6" /> : <CheckCircle size={20} className="sm:w-6 sm:h-6" />}
                            </div>

                            <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-2">
                                {attempt!.status === 'completed' ? 'Quiz Graded!' : 'Attempt Submitted'}
                            </h3>

                            <p className="text-xs sm:text-sm text-gray-500 mb-6">
                                {attempt!.status === 'completed'
                                    ? `Great effort! Your results are ready.`
                                    : `You submitted this quiz on ${new Date(attempt!.submittedAt).toLocaleDateString()}. Results are currently being processed.`
                                }
                            </p>

                            <div className={`inline-flex items-center gap-2 bg-white px-4 py-3 rounded-xl shadow-sm border ${attempt!.status === 'completed' ? 'border-green-100' : 'border-blue-50'
                                }`}>
                                {attempt!.status === 'completed' ? (
                                    <>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Final Score</span>
                                        <div className="h-4 w-px bg-gray-200"></div>
                                        <span className="text-xl font-extrabold text-green-600">{attempt!.score}%</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock size={14} className="text-brand-blue" />
                                        <span className="text-[10px] sm:text-xs font-bold text-brand-blue">Grading in progress</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-10 leading-relaxed">
                                {session.description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
                                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl">
                                    <div className="mt-0.5 sm:mt-1 bg-brand-blue/10 text-brand-blue p-2 rounded-lg"><Clock size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-xs sm:text-sm">Duration</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">{session.durationMinutes} Minutes</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl">
                                    <div className="mt-0.5 sm:mt-1 bg-brand-blue/10 text-brand-blue p-2 rounded-lg"><BookOpen size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-xs sm:text-sm">Questions</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">{session.questions.length} Items</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl">
                                    <div className="mt-0.5 sm:mt-1 bg-brand-blue/10 text-brand-blue p-2 rounded-lg"><Shield size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-xs sm:text-sm">One Attempt</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">Cannot be restarted.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl">
                                    <div className="mt-0.5 sm:mt-1 bg-brand-blue/10 text-brand-blue p-2 rounded-lg"><Brain size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-xs sm:text-sm">Blind Results</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">Scores hidden until graded.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 mb-8 sm:mb-10">
                                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0 sm:w-[18px] sm:h-[18px]" />
                                <p className="text-[10px] sm:text-xs font-medium text-amber-700 leading-relaxed">
                                    <strong>Warning:</strong> Stable internet required. Timer continues if tab is closed.
                                </p>
                            </div>

                            <button
                                onClick={onStart}
                                className="w-full bg-brand-dark text-white py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-extrabold text-lg sm:text-xl hover:bg-black transition-all shadow-xl shadow-brand-dark/30 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                            >
                                Begin Challenge <ArrowRight size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </>
                    )}

                    {!hasAttempted && (
                        <button onClick={onClose} className="w-full mt-4 text-gray-400 font-bold text-[10px] sm:text-sm hover:text-gray-600 transition-colors">
                            Maybe Later
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
