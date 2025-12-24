
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Settings {
    maintenanceMode: boolean;
    allowSignups: boolean;
    announcement: string;
    mcampLive: boolean;
    mcampEnrollment: boolean;
    proDiscountEnabled: boolean;
    proDiscountPercentage: number;
}

const defaultSettings: Settings = {
    maintenanceMode: false,
    allowSignups: true,
    announcement: '',
    mcampLive: false,
    mcampEnrollment: true,
    proDiscountEnabled: true,
    proDiscountPercentage: 10
};

const SettingsContext = createContext<Settings>(defaultSettings);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<Settings>(defaultSettings);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
            if (snapshot.exists()) {
                setSettings(prev => ({ ...prev, ...snapshot.data() } as Settings));
            }
        }, (error) => {
            console.error("Settings Listener Error:", error);
        });
        return () => unsub();
    }, []);

    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
