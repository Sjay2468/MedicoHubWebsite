import * as React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Dashboard } from './pages/Dashboard';
import { Learning } from './pages/Learning';
import { Profile } from './pages/Profile';
import { Store } from './pages/Store';
import { Pricing } from './pages/Pricing';
import { About } from './pages/About';
import { MCamp } from './pages/MCamp';
import { MCampUserDashboard } from './pages/MCampUserDashboard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Legal } from './pages/Legal';
import { User, AppRoute, Notification } from './types';
import { Stethoscope } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './services/firebase';
import { StatusModal, ModalType } from './components/StatusModal';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { NotFound } from './components/NotFound';

const queryClient = new QueryClient();

// Layout component to control footer visibility
const MainLayout: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const location = useLocation();

  // Routes where the footer should be HIDDEN
  const hideFooterRoutes = [
    AppRoute.DASHBOARD,
    AppRoute.LEARNING,
    AppRoute.PROFILE,
    AppRoute.MCAMP_DASHBOARD,
    AppRoute.ONBOARDING,
    AppRoute.LOGIN,
    AppRoute.SIGNUP,
    AppRoute.FORGOT_PASSWORD
  ];

  // Also hide footer for direct resource links like /learning/m1
  const isLearningResource = location.pathname.startsWith(AppRoute.LEARNING + '/');
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname as AppRoute) && !isLearningResource;

  return (
    <div className="min-h-screen font-sans selection:bg-brand-yellow selection:text-brand-dark bg-white flex flex-col">
      <Navbar user={user} />

      <main className="flex-grow">
        {children}
      </main>

      {shouldShowFooter && <Footer />}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user: firebaseUser, loading, logout, deleteAccount } = useAuth();
  const { maintenanceMode } = useSettings();
  const [user, setUser] = React.useState<User | null>(null);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [appLoading, setAppLoading] = React.useState(true);
  const [modalConfig, setModalConfig] = React.useState<{ isOpen: boolean; title: string; message: string; type: ModalType }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Sync Firebase User with App User State
  // Sync Firebase User with App User State (Real-time)
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupUserListener = async () => {
      if (firebaseUser) {
        setAppLoading(true);
        try {
          unsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;

              // Logic to update streak only once per session/day could go here, 
              // but for simplicity we'll just Load the data.
              // The streak update logic was modifying DB on load, which might cause loops if not careful with snapshot.
              // We will skip the auto-write for streak inside the snapshot listener to avoid infinite loops.

              setUser({ ...userData, emailVerified: firebaseUser.emailVerified });

              // Merge real-time notifications? 
              // Actually generateNotifications creates STATIC/Local ones. 
              // We should keep them but maybe re-generate if user data changes (e.g. course added).
              const localNotifs = generateNotifications(userData);

              // We need to merge these with the "broadcasts" fetched in another effect
              // The other effect updates 'notifications' state directly. 
              // This might cause a conflict if we overwrite plain 'setNotifications'.
              // Strategy: We will just update the user state here. 
              // The broadcast effect depends on [user] so it will re-run and re-merge everything.

              // However, we need to initialize notifications at least once
              setNotifications(prev => {
                // Primitive merge: keep existing broadcasts, replace locals
                const broadcasts = prev.filter(n => n.isBroadcast || n.id.startsWith('email-verified'));
                // Dedup based on ID
                const existingIds = new Set(broadcasts.map(n => n.id));
                const newLocals = localNotifs.filter(n => !existingIds.has(n.id));
                return [...broadcasts, ...newLocals];
              });

            } else {
              // Fallback
              setUser({
                name: firebaseUser.displayName || 'Student',
                email: firebaseUser.email || '',
                isSubscribed: false,
              } as User);
            }
            setAppLoading(false);
          }, (error) => {
            console.error("Error listening to user data:", error);
            setAppLoading(false);
          });
        } catch (error) {
          console.error("Error setting up listener:", error);
          setAppLoading(false);
        }
      } else {
        setUser(null);
        setNotifications([]);
        setAppLoading(false);
      }
    };

    if (!loading) {
      setupUserListener();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser, loading]);

  // SUBSCRIPTION EXPIRATION CHECK: 
  // We check if the user's Pro account has exceeded 30 days (Monthly) or 365 days (Yearly).
  React.useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user || !user.isSubscribed || !user.subscriptionDate) return;

      const subDate = new Date(user.subscriptionDate);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));

      const plan = user.subscriptionPlan || 'monthly';
      const limit = plan === 'annual' ? 365 : 30;

      if (diffInDays >= limit) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser!.uid), {
            isSubscribed: false,
            subscriptionPlan: null,
            subscriptionDate: null
          });

          // Notify the user via a local notification
          const expiredNotif: Notification = {
            id: 'sub-expired-' + Date.now(),
            title: 'Subscription Expired',
            message: 'Your Pro plan has ended. Upgrade again to keep your benefits!',
            type: 'alert',
            date: new Date().toLocaleDateString(),
            read: false
          };
          setNotifications(prev => [expiredNotif, ...prev]);
        } catch (e) {
          console.error("Failed to update expired subscription:", e);
        }
      }
    };

    checkSubscriptionStatus();
  }, [user, firebaseUser]);

  // Check for email verification status and notify
  React.useEffect(() => {
    if (firebaseUser?.emailVerified) {
      const storageKey = `verified_notification_sent_${firebaseUser.uid}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (!alreadyNotified) {
        const verificationNotification: Notification = {
          id: 'email-verified-' + Date.now(),
          title: 'Email Verified',
          message: 'Your email address has been successfully verified. Thank you!',
          type: 'success',
          date: new Date().toLocaleDateString(),
          read: false
        };

        setNotifications(prev => [verificationNotification, ...prev]);
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [firebaseUser]);


  // Helper function
  const generateNotifications = (u: User) => {
    const newNotifs: Notification[] = [];
    const now = new Date();

    if (!u.phoneNumber || !u.email || (u.currentCourses && u.currentCourses.length === 0)) {
      newNotifs.push({
        id: 'profile-inc',
        title: 'Complete Your Profile',
        message: 'Add your contact info and current courses to get personalized recommendations.',
        type: 'alert',
        date: 'Just now',
        read: false
      });
    }

    newNotifs.push({
      id: 'new-course',
      title: 'New Content Added',
      message: 'Neurology: Central Nervous System Basics has been added to your Learning Library.',
      type: 'success',
      date: '2 hours ago',
      read: false
    });

    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() >= lastDayOfMonth - 3) {
      newNotifs.push({
        id: 'analytics',
        title: 'Monthly Analytics Ready',
        message: `Your study analytics for ${now.toLocaleString('default', { month: 'long' })} are ready for review.`,
        type: 'info',
        date: 'Yesterday',
        read: false
      });
    }

    return newNotifs;
  };

  // FETCH BROADCASTS
  React.useEffect(() => {
    if (!user) return;

    const targets = ['all'];
    if (user.year) targets.push(user.year);
    if (user.uid) targets.push(user.uid); // Listen for personal notifications

    const q = query(
      collection(db, 'notifications'),
      where('target', 'in', targets)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const broadcasts = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateStr = 'Just Now';
        let rawDate = Date.now();

        if (data.createdAt) {
          const d = new Date(data.createdAt);
          dateStr = d.toLocaleDateString();
          rawDate = d.getTime();
        }

        return {
          id: doc.id,
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          date: dateStr,
          rawDate: rawDate,
          read: data.read || false,
          isBroadcast: true
        } as Notification & { isBroadcast?: boolean; rawDate?: number };
      });

      // Merge with local static ones
      setNotifications(prev => {
        const locals = prev.filter(n => !n.isBroadcast);
        const all = [...locals, ...broadcasts];
        // Sort by date desc (newest first)
        return all.sort((a, b) => {
          const timeA = (a as any).rawDate || Date.parse(a.date) || 0;
          const timeB = (b as any).rawDate || Date.parse(b.date) || 0;
          return timeB - timeA;
        });
      });
    });

    return () => unsubscribe();
  }, [user?.year, user?.uid]); // Re-run if user changes reference


  const handleUpdateUser = async (data: Partial<User>) => {
    if (user && firebaseUser) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      // Update Firestore
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), data);
      } catch (e) {
        console.error("Error updating user profile", e);
      }
    }
  };

  const handleSubscriptionComplete = (isPro: boolean) => {
    handleUpdateUser({ isSubscribed: isPro });
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNotifications([]);
  };

  const handleDeleteAccount = async () => {
    try {
      if (deleteAccount) {
        await deleteAccount();
        setUser(null);
        setNotifications([]);
        window.location.href = '/'; // Hard refresh to clear any lingering state
      }
    } catch (error: any) {
      console.error("Failed to delete account from App handler", error);
      let title = 'Deletion Failed';
      let message = 'Failed to delete account. Please try again.';
      let type: ModalType = 'error';

      if (error.code === 'auth/requires-recent-login') {
        title = 'Security Verification Required';
        message = 'For security reasons, please log out and log back in, then try deleting your account again.';
        type = 'info';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Account deletion is currently disabled by the administrator.';
      } else {
        message = error.message || 'An unknown error occurred while deleting your account.';
      }

      setModalConfig({
        isOpen: true,
        title,
        message,
        type
      });
    }
  };

  const [clearedNotificationIds, setClearedNotificationIds] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('cleared_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist cleared notifications
  React.useEffect(() => {
    localStorage.setItem('cleared_notifications', JSON.stringify(clearedNotificationIds));
  }, [clearedNotificationIds]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotification = (id: string) => {
    setClearedNotificationIds(prev => [...prev, id]);
  };

  const handleClearAll = () => {
    const ids = notifications.map(n => n.id);
    setClearedNotificationIds(prev => [...new Set([...prev, ...ids])]);
  };

  // Filter out cleared notifications for display
  const visibleNotifications = React.useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => !clearedNotificationIds.includes(n.id));
  }, [notifications, clearedNotificationIds]);

  if (loading || appLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-blue text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-blue/30 mb-6 animate-bounce">
            <Stethoscope size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight mb-2">Medico<span className="text-brand-blue">Hub</span></h2>
        </div >
      </div >
    );
  }



  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mb-8 animate-bounce">
          <Stethoscope size={48} className="text-brand-blue" />
        </div>
        <h1 className="text-4xl font-extrabold text-brand-dark mb-4">Under Maintenance</h1>
        <p className="text-gray-500 max-w-md mx-auto text-lg mb-8">
          We're currently upgrading the platform to improve your experience.
          Please check back soon.
        </p>
        <div className="bg-blue-50 text-brand-blue px-6 py-3 rounded-full font-bold text-sm">
          Expected downtime: ~1 hour
        </div>
      </div>
    );
  }

  // Wrappers to pass to Login/Signup are no longer needed as they used context directly,
  // but we keep the prop interface for now or refactor pages.
  const noop = () => { };

  const commonProps = {
    notifications: visibleNotifications,
    onMarkAllRead: handleMarkAllRead,
    onClearNotification: handleClearNotification,
    onClearAll: handleClearAll,
    onLogout: handleLogout,
    onDeleteAccount: handleDeleteAccount
  };

  return (
    <MainLayout user={user}>
      <StatusModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <Routes>
        <Route path={AppRoute.HOME} element={<LandingPage />} />
        <Route path={AppRoute.ABOUT} element={<About />} />
        <Route path={AppRoute.PRICING} element={<Pricing user={user} />} />
        <Route path={AppRoute.MCAMP} element={<MCamp user={user} onLogout={handleLogout} />} />

        <Route
          path={AppRoute.LOGIN}
          element={
            user ? (
              !user.year ? <Navigate to={AppRoute.ONBOARDING} /> : <Navigate to={AppRoute.DASHBOARD} />
            ) : <Login onLogin={noop} />
          }
        />

        <Route
          path={AppRoute.SIGNUP}
          element={
            user ? (
              !user.year ? <Navigate to={AppRoute.ONBOARDING} /> : <Navigate to={AppRoute.DASHBOARD} />
            ) : <Signup onSignup={noop} />
          }
        />

        <Route
          path={AppRoute.FORGOT_PASSWORD}
          element={
            user ? <Navigate to={AppRoute.DASHBOARD} /> : <ForgotPassword />
          }
        />

        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          path={AppRoute.ONBOARDING}
          element={
            user ? <Onboarding updateUser={handleUpdateUser} /> : <Navigate to={AppRoute.SIGNUP} />
          }
        />


        <Route
          path={AppRoute.DASHBOARD}
          element={
            user ? <Dashboard user={user} {...commonProps} /> : <Navigate to={AppRoute.LOGIN} />
          }
        />

        <Route
          path={AppRoute.PROFILE}
          element={
            user ? <Profile
              user={user}
              onUpdate={handleUpdateUser}
              {...commonProps}
            /> : <Navigate to={AppRoute.LOGIN} />
          }
        />

        <Route
          path={AppRoute.LEARNING}
          element={
            user ? <Learning user={user} {...commonProps} /> : <Navigate to={AppRoute.LOGIN} />
          }
        />

        {/* Direct Link to a resource */}
        <Route
          path={`${AppRoute.LEARNING}/:resourceId`}
          element={
            user ? <Learning user={user} {...commonProps} /> : <Navigate to={AppRoute.LOGIN} />
          }
        />

        <Route
          path={AppRoute.MCAMP_DASHBOARD}
          element={
            user ? <MCampUserDashboard user={user} onUpdateUser={handleUpdateUser} {...commonProps} /> : <Navigate to={AppRoute.LOGIN} />
          }
        />

        <Route path={AppRoute.STORE} element={<Store user={user} />} />
        <Route path={AppRoute.PRIVACY} element={<PrivacyPolicy />} />
        <Route path={AppRoute.TERMS} element={<TermsOfService />} />
        <Route path={AppRoute.LEGAL} element={<Legal />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
};

const App: React.FC = () => {
  console.log("🧩 Medico Hub: App Component Init");
  return (
    <AuthProvider>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <ScrollToTop />
            <AppContent />
          </HashRouter>
        </QueryClientProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;