import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    uid: string; // Firebase UID
    name: string;
    email: string;
    role: 'student' | 'admin';
    academicYear: 'Year 1' | 'Year 2' | 'Clinical' | 'Final Year' | 'General';
    institution: string;
    photoURL?: string;

    isSubscribed: boolean;
    subscriptions: {
        planId: string;
        startDate: Date;
        endDate: Date;
    }[];

    mcamp?: {
        isEnrolled: boolean;
        cohortId: string;
        uniqueId: string;
        enrollmentDate: Date;
    };

    analytics?: {
        totalSecondsStudied: number;
        pointsEarned: number;
        streakDays: number;
        lastActive: Date;
    };

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    academicYear: { type: String, default: 'General' },
    institution: { type: String },

    // photoURL: { type: String }, // Actually let's just add it
    photoURL: { type: String },
    isSubscribed: { type: Boolean, default: false },
    subscriptions: [{
        planId: String,
        startDate: Date,
        endDate: Date
    }],

    mcamp: {
        isEnrolled: { type: Boolean, default: false },
        cohortId: String,
        uniqueId: String,
        enrollmentDate: Date
    },

    analytics: {
        totalSecondsStudied: { type: Number, default: 0 },
        pointsEarned: { type: Number, default: 0 },
        streakDays: { type: Number, default: 0 },
        lastActive: Date
    }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
