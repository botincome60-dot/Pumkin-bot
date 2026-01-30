// app-firebase-pumpkin.js - মিষ্টি কুমড়া বট - AUTO REFERRAL BONUS ON REFRESH
console.log("🎃 মিষ্টি কুমড়া বট লোড হচ্ছে... (Firebase)");

const tg = window.Telegram?.WebApp;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDrb8fC3-nmDWAj85T9bqSaMKB9otnRgQ",
  authDomain: "reyrtyreyrty.firebaseapp.com",
  projectId: "reyrtyreyrty",
  storageBucket: "reyrtyreyrty.firebasestorage.app",
  messagingSenderId: "125368788252",
  appId: "1:125368788252:web:2bc2907576ff2239d5c6d9",
  measurementId: "G-ZYXG4GS7XE"
};

// Global instances
let db = null;
let userData = null;
let currentUserId = null;

// ✅ CORRECT Referral Link Format
function generateReferralLink() {
    if (!userData || !userData.id) return 'https://t.me/mishti_kumra_bot';
    
    const userId = userData.id.toString().replace('test_', '');
    return `https://t.me/mishti_kumra_bot/app?startapp=ref${userId}`;
}

function generateShareableReferralLink() {
    return generateReferralLink();
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase initialized");
        } else {
            console.log("✅ Firebase already initialized");
        }
        
        db = firebase.firestore();
        return true;
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        return false;
    }
}

// Get unique user ID
function getUserId() {
    let userId;
    
    if (tg?.initDataUnsafe?.user?.id) {
        userId = tg.initDataUnsafe.user.id.toString();
        console.log("📱 টেলিগ্রাম ইউজার আইডি:", userId);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const startappParam = urlParams.get('startapp');
        
        if (startappParam && startappParam.startsWith('ref')) {
            userId = 'ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        } else {
            userId = 'web_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }
        console.log("🌐 ওয়েব ইউজার আইডি:", userId);
    }
    
    return userId;
}

// Load user data
function loadUserFromLocalStorage(userId) {
    try {
        const key = `userData_${userId}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error("LocalStorage load error:", e);
        return null;
    }
}

// Save user data
function saveUserToLocalStorage(userId, data) {
    try {
        const key = `userData_${userId}`;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("LocalStorage save error:", e);
    }
}

// ✅ FORCE REFRESH USER DATA FROM FIREBASE
async function refreshUserDataFromFirebase() {
    if (!userData || !userData.id || !db) return false;
    
    try {
        console.log("🔄 Force refreshing user data from Firebase...");
        
        // Get latest data from Firebase
        const userDoc = await db.collection('users').doc(userData.id).get();
        
        if (userDoc.exists) {
            const serverData = userDoc.data();
            
            // Merge with local data (preserve any local changes)
            const updatedData = { ...userData, ...serverData };
            
            // Ensure ID is preserved
            updatedData.id = userData.id;
            
            // Update global userData
            userData = updatedData;
            
            // Save to localStorage
            saveUserToLocalStorage(userData.id, userData);
            
            console.log("✅ User data refreshed from Firebase");
            console.log("- New Balance:", userData.balance);
            
            return true;
        }
    } catch (error) {
        console.error("❌ Refresh from Firebase error:", error);
    }
    return false;
}

// ✅ FORCE BALANCE SYNC FROM FIREBASE
async function syncBalanceFromFirebase() {
    if (!userData || !userData.id || !db) return false;
    
    try {
        console.log("🔄 Syncing balance from Firebase...");
        
        const userDoc = await db.collection('users').doc(userData.id).get();
        
        if (userDoc.exists) {
            const serverData = userDoc.data();
            const serverBalance = serverData.balance || 0;
            const localBalance = userData.balance || 0;
            
            console.log("💸 Balance Comparison:");
            console.log("- Local Balance:", localBalance);
            console.log("- Server Balance:", serverBalance);
            
            if (Math.abs(serverBalance - localBalance) > 0.01) {
                console.log("⚠️ Balance mismatch detected!");
                userData.balance = serverBalance;
                saveUserToLocalStorage(userData.id, userData);
                updateAllPagesUI();
                console.log("✅ Balance synced from Firebase");
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("❌ Balance sync error:", error);
        return false;
    }
}

// ✅ UPDATE ALL PAGES WITH FORCE REFRESH
async function forceUpdateAllPagesUI() {
    if (!userData || !userData.id) return;
    
    try {
        // Try to get latest data from Firebase first
        if (db) {
            await refreshUserDataFromFirebase();
        }
        
        // Then update UI
        updateAllPagesUI();
        
        console.log("✅ Force UI update completed");
    } catch (error) {
        console.error("❌ Force update error:", error);
        // Fallback to normal update
        updateAllPagesUI();
    }
}

// Initialize user data
async function initializeUserData() {
    console.log("🔄 ইউজার ডেটা ইনিশিয়ালাইজ হচ্ছে...");
    
    try {
        if (tg) {
            tg.expand();
            tg.ready();
        }

        currentUserId = getUserId();
        userData = null;
        
        const localUserData = loadUserFromLocalStorage(currentUserId);
        
        if (localUserData && localUserData.id === currentUserId) {
            userData = localUserData;
            console.log("📱 লোকাল স্টোরেজ থেকে ডেটা লোড হয়েছে");
            console.log("💰 Local balance:", userData.balance);
        }
        
        if (!db) {
            console.log("⚠️ Firebase not available, using local storage");
            if (!userData) {
                userData = createNewUser(currentUserId);
                saveUserToLocalStorage(currentUserId, userData);
            }
            updateAllPagesUI();
            hideLoading();
            return;
        }
        
        try {
            const userDoc = await db.collection('users').doc(currentUserId).get();
            
            if (userDoc.exists) {
                const serverData = userDoc.data();
                
                // Check if server data is newer
                const serverTime = new Date(serverData.last_active || 0).getTime();
                const localTime = userData ? new Date(userData.last_active || 0).getTime() : 0;
                
                if (userData) {
                    // Use server data if it's newer or if balances differ significantly
                    if (serverTime > localTime || Math.abs((serverData.balance || 0) - (userData.balance || 0)) > 10) {
                        console.log("🔄 Server data is newer, using server data");
                        userData = { ...serverData, ...userData };
                    } else {
                        // Keep local data but update with any missing fields
                        userData = { ...serverData, ...userData };
                    }
                } else {
                    userData = serverData;
                }
                
                userData.id = currentUserId;
                
                console.log("✅ Firebase থেকে ইউজার ডেটা লোড হয়েছে");
                console.log("💰 Firebase balance:", userData.balance);
            } else {
                if (!userData) {
                    userData = createNewUser(currentUserId);
                }
                
                await db.collection('users').doc(currentUserId).set(userData);
                console.log("✅ নতুন ইউজার Firebase এ তৈরি হয়েছে");
            }
            
        } catch (firebaseError) {
            console.error("❌ Firebase ফেচ এরর:", firebaseError);
            if (!userData) {
                userData = createNewUser(currentUserId);
            }
        }
        
        saveUserToLocalStorage(currentUserId, userData);
        
        // Process referral
        await processReferralWithStartApp();
        
        // ✅ AUTO ADD REFERRAL BONUS ON REFRESH
        await autoAddReferralBonus();
        
        // Force update UI with latest data
        await forceUpdateAllPagesUI();
        hideLoading();
        
    } catch (error) {
        console.error("❌ Init error:", error);
        userData = createFallbackUser(currentUserId);
        saveUserToLocalStorage(currentUserId, userData);
        fallbackUI();
        hideLoading();
    }
}

// Create new user
function createNewUser(userId) {
    const now = new Date();
    const userName = tg?.initDataUnsafe?.user?.first_name || 'ইউজার';
    
    return {
        id: userId,
        first_name: userName,
        username: tg?.initDataUnsafe?.user?.username || '',
        balance: 50.00,
        today_ads: 0,
        total_ads: 0,
        today_bonus_ads: 0,
        today_bonus_ads_2: 0,
        total_referrals: 0,
        total_income: 50.00,
        join_date: now.toISOString(),
        last_active: now.toISOString(),
        referred_by: null,
        last_daily_reset: now.toISOString()
    };
}

// Create fallback user
function createFallbackUser(userId) {
    return {
        id: userId,
        first_name: 'ইউজার',
        balance: 50.00,
        today_ads: 0,
        total_ads: 0,
        total_income: 50.00,
        total_referrals: 0
    };
}

// ✅ FIXED Update user data - ENSURES BALANCE SYNC
async function updateUserData(updates) {
    if (!userData || !userData.id) return userData;
    
    try {
        console.log("🔄 Updating user data:", updates);
        
        // Special handling for balance updates
        if (updates.balance !== undefined) {
            console.log("💰 Balance update requested:", updates.balance);
            
            // Apply balance update to local data
            userData.balance = updates.balance;
            userData.last_active = new Date().toISOString();
            
            // Save to localStorage
            saveUserToLocalStorage(userData.id, userData);
            
            // Update Firebase if available
            if (db) {
                await db.collection('users').doc(userData.id).update({
                    balance: updates.balance,
                    last_active: new Date().toISOString()
                });
                console.log("✅ Balance updated in Firebase");
            }
            
            // Update UI immediately
            updateAllPagesUI();
            return userData;
        }
        
        // Normal updates for other fields
        Object.assign(userData, updates);
        userData.last_active = new Date().toISOString();
        
        saveUserToLocalStorage(userData.id, userData);
        
        if (db) {
            const firebaseData = { ...updates };
            firebaseData.last_active = new Date().toISOString();
            
            await db.collection('users').doc(userData.id).update(firebaseData);
            console.log("✅ Firebase আপডেট সফল");
        }
        
        updateAllPagesUI();
        return userData;
        
    } catch (error) {
        console.error("❌ Update error:", error);
        Object.assign(userData, updates);
        saveUserToLocalStorage(userData.id, userData);
        updateAllPagesUI();
        return userData;
    }
}

// ✅ FIXED Save withdraw to Firebase - ACTUALLY DEDUCTS MONEY
async function saveWithdrawToFirebase(amount, accountNumber, method) {
    try {
        const user = getUserData();
        if (!user) {
            throw new Error('User data not available');
        }
        
        if (!db) {
            throw new Error('Firebase not available');
        }
        
        // ✅ FIRST: Get current balance from Firebase
        const userRef = db.collection('users').doc(user.id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            throw new Error('User not found in database');
        }
        
        const currentUserData = userDoc.data();
        const currentBalance = currentUserData.balance || 0;
        
        // Check if user has enough balance
        if (currentBalance < amount) {
            throw new Error(`Insufficient balance. Available: ${currentBalance}, Requested: ${amount}`);
        }
        
        // Calculate new balance after withdrawal
        const newBalance = currentBalance - amount;
        
        console.log("💰 Withdrawal Processing:");
        console.log("- User ID:", user.id);
        console.log("- Current Balance:", currentBalance);
        console.log("- Withdraw Amount:", amount);
        console.log("- New Balance:", newBalance);
        
        // ✅ UPDATE USER BALANCE IN FIREBASE FIRST
        await userRef.update({
            balance: newBalance,
            last_active: new Date().toISOString()
        });
        
        console.log("✅ Balance updated in Firebase");
        
        // ✅ THEN: Save withdrawal record
        const withdrawData = {
            user_id: user.id,
            user_name: user.first_name || 'ইউজার',
            amount: parseFloat(amount),
            account_number: accountNumber,
            method: method,
            status: 'pending',
            requested_at: new Date().toISOString(),
            processed_at: null,
            transaction_id: `TX${Date.now()}`,
            previous_balance: currentBalance,
            new_balance: newBalance
        };
        
        await db.collection('withdrawals').add(withdrawData);
        
        // ✅ Save transaction record
        await db.collection('transactions').add({
            user_id: user.id,
            type: 'withdrawal_request',
            amount: parseFloat(amount),
            description: `${method} উত্তোলন রিকোয়েস্ট - ${accountNumber}`,
            timestamp: new Date().toISOString(),
            status: 'pending',
            previous_balance: currentBalance,
            new_balance: newBalance
        });
        
        console.log("✅ Withdraw request saved to Firebase");
        
        // ✅ Update local user data to match Firebase
        if (userData && userData.id === user.id) {
            userData.balance = newBalance;
            userData.last_active = new Date().toISOString();
            saveUserToLocalStorage(user.id, userData);
            console.log("✅ Local user data updated");
        }
        
        // ✅ Force UI update
        updateAllPagesUI();
        
        return true;
        
    } catch (error) {
        console.error("❌ Error saving withdrawal:", error);
        throw error;
    }
}

// ✅ AUTO ADD REFERRAL BONUS ON REFRESH (SILENT)
async function autoAddReferralBonus() {
    if (!userData || !db) return;
    
    console.log("🤫 সাইলেন্ট রেফারেল বোনাস চেক...");
    
    try {
        // Get all referrals where I am the referrer
        const referralsQuery = await db.collection('referrals')
            .where('referred_by', '==', userData.id)
            .get();
        
        const myReferralsCount = referralsQuery.size;
        console.log(`📊 আমার রেফারেল: ${myReferralsCount} জন`);
        
        if (myReferralsCount === 0) {
            console.log("📭 কোনো রেফারেল নেই");
            return;
        }
        
        // Get my current data from Firebase
        const myDoc = await db.collection('users').doc(userData.id).get();
        
        if (!myDoc.exists) {
            console.log("❌ আমার ডেটা পাওয়া যায়নি");
            return;
        }
        
        const myData = myDoc.data();
        const myCurrentBalance = myData.balance || 0;
        const myCurrentReferrals = myData.total_referrals || 0;
        
        // Each referral should give me 100 Taka
        const totalBonusShouldHave = myReferralsCount * 100;
        
        // Starting balance: 50 Taka
        // Each referral: +100 Taka
        const minimumExpectedBalance = 50 + totalBonusShouldHave;
        
        console.log(`💰 বর্তমান ব্যালেন্স: ${myCurrentBalance}`);
        console.log(`💰 হওয়া উচিত ব্যালেন্স: ${minimumExpectedBalance}`);
        
        // Check if missing bonus
        if (myCurrentBalance < minimumExpectedBalance) {
            const missingBonus = minimumExpectedBalance - myCurrentBalance;
            console.log(`💰 মিসিং বোনাস: ${missingBonus} টাকা`);
            
            if (missingBonus > 0) {
                // Update my balance SILENTLY (no notification)
                const newBalance = myCurrentBalance + missingBonus;
                const newTotalIncome = (myData.total_income || 0) + missingBonus;
                
                await db.collection('users').doc(userData.id).update({
                    balance: newBalance,
                    total_income: newTotalIncome,
                    total_referrals: myReferralsCount
                });
                
                // Update local data
                userData.balance = newBalance;
                userData.total_income = newTotalIncome;
                userData.total_referrals = myReferralsCount;
                saveUserToLocalStorage(userData.id, userData);
                
                console.log(`✅ ${missingBonus} টাকা যোগ করা হয়েছে (সাইলেন্ট)`);
                
                // Update UI silently
                updateAllPagesUI();
            }
        } else {
            // Just update referral count if different
            if (myReferralsCount !== myCurrentReferrals) {
                await updateUserData({
                    total_referrals: myReferralsCount
                });
                console.log(`✅ রেফারেল কাউন্ট আপডেট: ${myReferralsCount}`);
            }
        }
        
    } catch (error) {
        console.error("❌ অটো বোনাস এরর:", error);
    }
}

// Process referral
async function processReferralWithStartApp() {
    if (!userData || !db) return;
    
    try {
        let referralCode = null;
        
        if (tg?.initDataUnsafe?.start_param) {
            referralCode = tg.initDataUnsafe.start_param;
            console.log("📱 টেলিগ্রাম স্টার্ট প্যারাম:", referralCode);
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const startappParam = urlParams.get('startapp');
        if (startappParam && startappParam.startsWith('ref')) {
            referralCode = startappParam;
            console.log("🌐 URL থেকে রেফারেল কোড:", referralCode);
        }
        
        if (!referralCode || !referralCode.startsWith('ref')) {
            return;
        }
        
        const referrerUserId = referralCode.replace('ref', '');
        
        // Check if already processed
        const referralKey = `referral_processed_${userData.id}_${referrerUserId}`;
        const savedRef = localStorage.getItem(referralKey);
        if (savedRef === 'true') {
            console.log("✅ রেফারেল ইতিমধ্যে প্রসেস করা হয়েছে");
            return;
        }
        
        console.log("🎯 রেফারেল প্রসেস শুরু...");
        console.log("🔗 রেফারার আইডি:", referrerUserId);
        console.log("👤 বর্তমান ইউজার:", userData.id);
        
        if (referrerUserId === userData.id.toString()) {
            console.log("❌ নিজেকে রেফার করা যাবে না");
            return;
        }
        
        if (userData.referred_by) {
            console.log("❌ ইতিমধ্যে রেফার্ড");
            return;
        }
        
        // Get referrer's data from Firebase
        const referrerDoc = await db.collection('users').doc(referrerUserId).get();
        
        if (!referrerDoc.exists) {
            console.log("❌ রেফারার পাওয়া যায়নি");
            return;
        }
        
        const referrer = referrerDoc.data();
        console.log("✅ রেফারার ভ্যালিড:", referrer.first_name);
        
        // Check if referral already exists
        const existingRefQuery = await db.collection('referrals')
            .where('user_id', '==', userData.id)
            .where('referred_by', '==', referrerUserId)
            .get();
        
        if (!existingRefQuery.empty) {
            console.log("❌ রেফারেল ইতিমধ্যে আছে");
            localStorage.setItem(referralKey, 'true');
            return;
        }
        
        // ✅ STEP 1: Create referral record
        const referralData = {
            user_id: userData.id,
            user_name: userData.first_name || 'ইউজার',
            referred_by: referrerUserId,
            referrer_name: referrer.first_name || 'রেফারার',
            join_date: new Date().toISOString(),
            timestamp: Date.now(),
            status: 'completed',
            bonus_given: true,
            new_user_bonus: 50,
            referrer_bonus: 100
        };
        
        await db.collection('referrals').add(referralData);
        console.log("✅ রেফারেল রেকর্ড তৈরি হয়েছে");
        
        // ✅ STEP 2: Update CURRENT USER (Person B - gets 50 Taka)
        await updateUserData({
            referred_by: referrerUserId,
            balance: (userData.balance || 0) + 50,
            total_income: (userData.total_income || 0) + 50
        });
        
        console.log("✅ নতুন ইউজারকে ৫০ টাকা বোনাস দেওয়া হয়েছে");
        
        // ✅ STEP 3: Update REFERRER (Person A - gets 100 Taka)
        // Calculate referrer's new balance
        const referrerNewBalance = (referrer.balance || 0) + 100;
        const referrerNewTotalIncome = (referrer.total_income || 0) + 100;
        
        // Get referrer's referral count
        const referrerRefQuery = await db.collection('referrals')
            .where('referred_by', '==', referrerUserId)
            .get();
        
        const newReferralCount = referrerRefQuery.size;
        
        console.log(`💰 রেফারারের তথ্য:`);
        console.log(`- পুরাতন ব্যালেন্স: ${referrer.balance || 0}`);
        console.log(`- নতুন ব্যালেন্স: ${referrerNewBalance}`);
        console.log(`- পুরাতন রেফারেল কাউন্ট: ${referrer.total_referrals || 0}`);
        console.log(`- নতুন রেফারেল কাউন্ট: ${newReferralCount}`);
        
        // Update referrer in Firebase
        await db.collection('users').doc(referrerUserId).update({
            balance: referrerNewBalance,
            total_income: referrerNewTotalIncome,
            total_referrals: newReferralCount,
            last_active: new Date().toISOString()
        });
        
        console.log('💰 রেফারারকে ১০০ টাকা বোনাস দেওয়া হয়েছে');
        
        // ✅ STEP 4: If CURRENT USER is the REFERRER (Person A checking their own account),
        // we need to reload their data to show the 100 Taka bonus
        if (userData.id === referrerUserId) {
            console.log("🔄 রেফারার নিজের ডেটা রিফ্রেশ হচ্ছে...");
            // Reload user data from Firebase
            const updatedUserDoc = await db.collection('users').doc(userData.id).get();
            if (updatedUserDoc.exists) {
                const updatedData = updatedUserDoc.data();
                Object.assign(userData, updatedData);
                saveUserToLocalStorage(userData.id, userData);
                console.log("✅ রেফারারের ডেটা আপডেট হয়েছে");
            }
        }
        
        // ✅ STEP 5: Create transaction records
        await db.collection('transactions').add({
            user_id: userData.id,
            type: 'referral_bonus',
            amount: 50,
            description: 'রেফারেল বোনাস (নতুন ইউজার)',
            timestamp: new Date().toISOString(),
            status: 'completed'
        });
        
        await db.collection('transactions').add({
            user_id: referrerUserId,
            type: 'referral_bonus',
            amount: 100,
            description: `রেফারেল বোনাস (${userData.first_name || 'নতুন ইউজার'})`,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });
        
        // ✅ STEP 6: Mark as processed
        localStorage.setItem(referralKey, 'true');
        
        console.log("✅ রেফারেল প্রসেস সম্পূর্ণ");
        
        // Show success notification ONLY to new user
        setTimeout(() => {
            showNotification('🎉 রেফারেল সফল! আপনি ৫০ টাকা বোনাস পেয়েছেন!', 'success');
        }, 1500);
        
    } catch (error) {
        console.error('❌ রেফারেল এরর:', error);
        showNotification('রেফারেল প্রসেস করতে সমস্যা হয়েছে।', 'error');
    }
}

// Copy referral link
async function copyReferralLink() {
    if (!userData) {
        alert('ডেটা লোড হয়নি। রিফ্রেশ করুন।');
        return;
    }
    
    const shareLink = generateShareableReferralLink();
    
    try {
        await navigator.clipboard.writeText(shareLink);
        
        const referrals = userData.total_referrals || 0;
        const bonusAmount = referrals * 100;
        
        showNotification(
            `✅ রেফারেল লিঙ্ক কপি হয়েছে!\n\n` +
            `🔗 লিঙ্ক: ${shareLink}\n\n` +
            `👥 আপনার রেফারেল: ${referrals} জন\n` +
            `💰 বোনাস আয়: ${bonusAmount} টাকা\n\n` +
            `প্রতি রেফারেলে পাবেন ১০০ টাকা বোনাস!`,
            'success'
        );
        
    } catch (error) {
        const tempInput = document.createElement('input');
        tempInput.value = shareLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        const referrals = userData.total_referrals || 0;
        showNotification(
            `✅ রেফারেল লিঙ্ক কপি হয়েছে!\n\nআপনার রেফারেল: ${referrals} জন`,
            'success'
        );
    }
}

// Update all UI
function updateAllPagesUI() {
    if (!userData) return;
    
    const simpleRefLink = generateShareableReferralLink();
    
    const commonElements = {
        'userName': userData.first_name || 'ইউজার',
        'mainBalance': (userData.balance || 0).toFixed(2) + ' টাকা',
        'todayAds': (userData.today_ads || 0) + '/১০',
        'totalReferrals': userData.total_referrals || 0,
        'totalReferrals2': userData.total_referrals || 0,
        'totalAds': userData.total_ads || 0,
        'totalIncome': (userData.total_income || 0).toFixed(2) + ' টাকা',
        'adsRemaining': Math.max(0, 10 - (userData.today_ads || 0)),
        'bonusAdsCount': (userData.today_bonus_ads || 0) + '/১০',
        'bonusAdsCount2': (userData.today_bonus_ads_2 || 0) + '/১০',
        'adsCounter': (userData.today_ads || 0) + '/১০',
        'profileName': userData.first_name || 'ইউজার',
        'profileTotalIncome': (userData.total_income || 0).toFixed(2) + ' টাকা',
        'profileTotalAds': userData.total_ads || 0,
        'profileReferrals': userData.total_referrals || 0,
        'withdrawBalance': (userData.balance || 0).toFixed(2) + ' টাকা',
        'referralCount': userData.total_referrals || 0,
        'referralLink': simpleRefLink,
        'supportReferralLink': simpleRefLink,
        'profileUserId': userData.id ? userData.id.toString().replace(/^(test_|ref_|web_)/, '').substring(0, 8) : '০'
    };
    
    for (const [id, value] of Object.entries(commonElements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    updateProgressBars();
    updateResetTimers();
}

// Helper functions
function getUserData() {
    return userData;
}

async function checkAndResetDailyCounters() {
    try {
        const today = new Date().toDateString();
        const lastReset = userData.last_daily_reset;
        
        let lastResetDate;
        if (lastReset) {
            lastResetDate = new Date(lastReset);
        } else {
            lastResetDate = new Date();
        }
        
        if (lastResetDate.toDateString() !== today) {
            console.log("🔄 রিসেটিং ডেইলি কাউন্টার...");
            
            await updateUserData({
                today_ads: 0,
                today_bonus_ads: 0,
                today_bonus_ads_2: 0,
                last_daily_reset: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("❌ রিসেট এরর:", error);
    }
}

function canWatchMoreAds() {
    if (!userData) return false;
    return (userData.today_ads || 0) < 10;
}

function getTimeUntilNextReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}ঘ ${diffMinutes}মি`;
}

function canWatchMoreBonusAds() {
    if (!userData) return false;
    return (userData.today_bonus_ads || 0) < 10;
}

function getTimeUntilNextBonusReset() {
    return getTimeUntilNextReset();
}

function canWatchMoreBonusAds2() {
    if (!userData) return false;
    return (userData.today_bonus_ads_2 || 0) < 10;
}

function getTimeUntilNextBonusReset2() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    
    const diffMs = nextHour - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    return `${diffMinutes} মিনিট`;
}

function updateProgressBars() {
    if (!userData) return;
    
    const progress = ((userData.today_ads || 0) / 10) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function updateResetTimers() {
    const resetElements = document.querySelectorAll('[id*="resetTimer"]');
    resetElements.forEach(el => {
        el.textContent = getTimeUntilNextReset();
    });
}

function showNotification(message, type = 'info') {
    // Show all notifications except "already added" messages
    alert(message);
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function fallbackUI() {
    const elements = document.querySelectorAll('[id]');
    elements.forEach(el => {
        if (el.id.includes('Balance')) el.textContent = '50.00 টাকা';
        if (el.id.includes('Referral')) el.textContent = '০';
        if (el.id.includes('Income')) el.textContent = '50.00 টাকা';
    });
}

// ✅ ADD PAGE LOAD SYNC FUNCTION
async function syncUserDataOnPageLoad() {
    if (!userData || !userData.id) return;
    
    console.log("🔄 Syncing user data on page load...");
    
    try {
        if (db) {
            // Get fresh data from Firebase
            const userDoc = await db.collection('users').doc(userData.id).get();
            if (userDoc.exists) {
                const serverData = userDoc.data();
                
                // Update local data with server data
                Object.assign(userData, serverData);
                userData.id = userData.id; // Preserve ID
                
                // Save to localStorage
                saveUserToLocalStorage(userData.id, userData);
                
                console.log("✅ Synced from Firebase on page load");
                console.log("💰 Synced balance:", userData.balance);
                
                // Update UI
                updateAllPagesUI();
            }
        }
    } catch (error) {
        console.error("❌ Page load sync error:", error);
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🎯 Starting app initialization...");
    
    const firebaseScript = document.createElement('script');
    firebaseScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js";
    firebaseScript.async = true;
    document.head.appendChild(firebaseScript);
    
    firebaseScript.onload = function() {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js";
        firestoreScript.async = true;
        document.head.appendChild(firestoreScript);
        
        firestoreScript.onload = async function() {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                db = firebase.firestore();
                
                console.log("✅ Firebase initialized successfully");
                
                setTimeout(async () => {
                    await initializeUserData();
                    
                    // Sync on page load
                    await syncUserDataOnPageLoad();
                    
                    setInterval(() => {
                        if (userData) {
                            updateAllPagesUI();
                        }
                    }, 30000);
                    
                    setInterval(async () => {
                        if (userData) {
                            await checkAndResetDailyCounters();
                            updateAllPagesUI();
                        }
                    }, 300000);
                }, 1000);
                
            } catch (error) {
                console.error("❌ Firebase initialization error:", error);
                hideLoading();
            }
        };
    };
});

// Export functions
window.copyReferralLink = copyReferralLink;
window.getUserData = getUserData;
window.updateUserData = updateUserData;
window.canWatchMoreAds = canWatchMoreAds;
window.getTimeUntilNextReset = getTimeUntilNextReset;
window.canWatchMoreBonusAds = canWatchMoreBonusAds;
window.getTimeUntilNextBonusReset = getTimeUntilNextBonusReset;
window.canWatchMoreBonusAds2 = canWatchMoreBonusAds2;
window.getTimeUntilNextBonusReset2 = getTimeUntilNextBonusReset2;
window.saveWithdrawToFirebase = saveWithdrawToFirebase;
window.showNotification = showNotification;
window.hideLoading = hideLoading;
window.updateAllPagesUI = updateAllPagesUI;
window.copySupportReferral = copyReferralLink;
window.refreshUserDataFromFirebase = refreshUserDataFromFirebase;
window.forceUpdateAllPagesUI = forceUpdateAllPagesUI;
window.syncBalanceFromFirebase = syncBalanceFromFirebase;