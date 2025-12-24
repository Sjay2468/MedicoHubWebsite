
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

// HARDCODED CONFIG FOR TESTING
const firebaseConfig = {
    apiKey: "AIzaSyBp925XpuIB49A8sBDmuzxD3Ga9Cjj0JF4",
    authDomain: "mhub-2.firebaseapp.com",
    projectId: "mhub-2",
    storageBucket: "mhub-2.firebasestorage.app",
    messagingSenderId: "500917594004",
    appId: "1:500917594004:web:35210a0925cff4244e5181",
    measurementId: "G-3S31DEQVNS"
};

console.log("Testing Firebase Connection with Config:");
console.log("Project ID:", firebaseConfig.projectId);

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const runTest = async () => {
        try {
            console.log("Attempting to write to 'connection_test' collection...");
            const testCollection = collection(db, 'connection_test');
            const docRef = await addDoc(testCollection, {
                timestamp: new Date().toISOString(),
                test: true
            });
            console.log("Write Successful! Doc ID:", docRef.id);

            console.log("Attempting to read from 'connection_test'...");
            const querySnapshot = await getDocs(testCollection);
            console.log(`Read Successful! Found ${querySnapshot.size} documents.`);

            // Cleanup
            console.log("Cleaning up test doc...");
            await deleteDoc(doc(db, 'connection_test', docRef.id));
            console.log("Cleanup Successful.");

            console.log("✅ FIREBASE DATABASE IS WORKING CORRECTLY.");
        } catch (error: any) {
            console.error("❌ FIREBASE TEST FAILED:", error.message);
            if (error.code) console.error("Error Code:", error.code);
        }
    };

    runTest();

} catch (e: any) {
    console.error("Initialization Failed:", e.message);
}
