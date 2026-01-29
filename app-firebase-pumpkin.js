// app-firebase-pumpkin.js - মিষ্টি কুমড়া বট - Firebase Version - FIXED
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

// ✅ CORRECT Referral Link for sharing
function generateShareableReferralLink() {
    if (!userData || !userData.id) return 'https://t.me/mishti_kumra_bot';
    
    const userId = userData.id.toString().replace('test_', '');
    return `https://t.me/mishti_kumra_bot/app?startapp=ref${userId}`;
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
        
        // Firestore settings
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        // Enable offline persistence
        await db.enablePersistence()
            .catch((err) => {
                console.log("Firebase persistence error:", err.code);
            });
            
        return true;
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        return false;
    }
}

// Get unique user ID
function getUserId() {
    let userId;
    
    // Check Telegram user ID first (most reliable)
    if (tg?.initDataUnsafe?.user?.id) {
        userId = tg.initDataUnsafe.user.id.toString();
        console.log("📱 টেলিগ্রাম ইউজার আইডি:", userId);
    } else {
        // Check URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const startappParam = urlParams.get('startapp');
        
        if (startappParam && startappParam.startsWith('ref')) {
            // If coming via referral, generate random ID
            userId = 'ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        } else {
            // Generate random ID for web users
            userId = 'web_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }
        console.log("🌐 ওয়েব ইউজার আইডি:", userId);
    }
    
    return userId;
}

// Load user data with user-specific localStorage
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

// Save user data with user-specific localStorage
function saveUserToLocalStorage(userId, data) {
    try {
        const key = `userData_${userId}`;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("LocalStorage save error:", e);
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

        // Get unique user ID
        currentUserId = getUserId();
        console.log("👤 বর্তমান ইউজার আইডি:", currentUserId);
        
        // Clear any old global user data
        userData = null;
        
        // Try to load from localStorage first
        const localUserData = loadUserFromLocalStorage(currentUserId);
        
        if (localUserData && localUserData.id === currentUserId) {
            userData = localUserData;
            console.log("📱 লোকাল স্টোরেজ থেকে ডেটা লোড হয়েছে:", userData);
        }
        
        // Check Firebase availability
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
        
        // Try to fetch from Firebase
        try {
            console.log("🔥 Firebase থেকে ডেটা ফেচ করছে...");
            const userDoc = await db.collection('users').doc(currentUserId).get();
            
            if (userDoc.exists) {
                const serverData = userDoc.data();
                console.log("✅ Firebase থেকে ডেটা পাওয়া গেছে:", serverData);
                
                // Merge with local data if exists
                if (userData) {
                    userData = { ...serverData, ...userData };
                } else {
                    userData = serverData;
                }
                userData.id = currentUserId;
                
                console.log("✅ Firebase থেকে ইউজার ডেটা লোড হয়েছে");
            } else {
                // Create new user in Firebase
                console.log("🆕 নতুন ইউজার তৈরি হচ্ছে Firebase এ");
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
        
        // Save to localStorage
        saveUserToLocalStorage(currentUserId, userData);
        
        // Process referral - ADD DEBUG LOG
        console.log("🔗 রেফারেল প্রসেস শুরু...");
        await processReferralWithStartApp();
        
        // Load referral count
        await loadReferralCount();
        
        // Update UI
        updateAllPagesUI();
        
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

// Update user data
async function updateUserData(updates) {
    if (!userData || !userData.id) return userData;
    
    try {
        // Update local data
        Object.assign(userData, updates);
        userData.last_active = new Date().toISOString();
        
        // Save to localStorage
        saveUserToLocalStorage(userData.id, userData);
        
        // Try to update Firebase
        if (db) {
            const firebaseData = { ...userData };
            delete firebaseData.id;
            
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

// Load referral count
async function loadReferralCount() {
    if (!userData || !db) return;
    
    console.log("🔍 রেফারেল কাউন্ট লোড হচ্ছে...");
    
    try {
        const referralsQuery = await db.collection('referrals')
            .where('referred_by', '==', userData.id)
            .get();
        
        const count = referralsQuery.size;
        console.log("✅ রেফারেল কাউন্ট:", count);
        
        // Update if different
        if (count !== userData.total_referrals) {
            userData.total_referrals = count;
            
            await updateUserData({
                total_referrals: count
            });
        }
        
    } catch (error) {
        console.error("❌ রেফারেল কাউন্ট এরর:", error);
    }
}

// ✅ FIXED: Process referral with 100 Taka per referral
async function processReferralWithStartApp() {
    if (!userData || !db) return;
    
    try {
        let referralCode = null;
        
        // Check Telegram start parameter
        if (tg?.initDataUnsafe?.start_param) {
            referralCode = tg.initDataUnsafe.start_param;
            console.log("📱 টেলিগ্রাম স্টার্ট প্যারাম:", referralCode);
        }
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const startappParam = urlParams.get('startapp');
        if (startappParam && startappParam.startsWith('ref')) {
            referralCode = startappParam;
            console.log("🌐 URL থেকে রেফারেল কোড:", referralCode);
        }
        
        if (!referralCode || !referralCode.startsWith('ref')) {
            console.log("❌ কোনো রেফারেল কোড পাওয়া যায়নি");
            return;
        }
        
        const referrerUserId = referralCode.replace('ref', '');
        
        // Check if already processed for this user
        const referralKey = `referral_processed_${userData.id}_${referrerUserId}`;
        const savedRef = localStorage.getItem(referralKey);
        if (savedRef === 'true') {
            console.log("✅ রেফারেল ইতিমধ্যে প্রসেস করা হয়েছে");
            return;
        }
        
        console.log("🎯 রেফারেল প্রসেস শুরু...");
        console.log("🔗 রেফারার আইডি:", referrerUserId);
        console.log("👤 বর্তমান ইউজার:", userData.id);
        
        // Prevent self-referral
        if (referrerUserId === userData.id.toString()) {
            console.log("❌ নিজেকে রেফার করা যাবে না");
            return;
        }
        
        // Check if already referred
        if (userData.referred_by) {
            console.log("❌ ইতিমধ্যে রেফার্ড");
            return;
        }
        
        // Validate referrer exists
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
        
        // ✅ STEP 2: Update current user (50 টাকা bonus)
        const newUserBonus = 50;
        const newBalance = (userData.balance || 0) + newUserBonus;
        const newTotalIncome = (userData.total_income || 0) + newUserBonus;
        
        await updateUserData({
            referred_by: referrerUserId,
            balance: newBalance,
            total_income: newTotalIncome
        });
        
        console.log("✅ নতুন ইউজারকে ৫০ টাকা বোনাস দেওয়া হয়েছে");
        
        // ✅ STEP 3: Update referrer (100 টাকা bonus) - FIXED
        const referrerBonus = 100;
        const referrerNewBalance = (referrer.balance || 0) + referrerBonus;
        const referrerNewTotalIncome = (referrer.total_income || 0) + referrerBonus;
        
        // Get current referral count and increment
        const currentReferrals = (referrer.total_referrals || 0);
        const newReferralCount = currentReferrals + 1;
        
        // Update referrer's balance and referral count
        await db.collection('users').doc(referrerUserId).update({
            balance: referrerNewBalance,
            total_income: referrerNewTotalIncome,
            total_referrals: newReferralCount,
            last_active: new Date().toISOString()
        });
        
        console.log('💰 রেফারারকে ১০০ টাকা বোনাস দেওয়া হয়েছে');
        console.log('💰 রেফারার নতুন ব্যালেন্স:', referrerNewBalance);
        console.log('📊 রেফারার নতুন রেফারেল কাউন্ট:', newReferralCount);
        
        // ✅ STEP 4: Create transaction records
        await db.collection('transactions').add({
            user_id: userData.id,
            type: 'referral_bonus',
            amount: newUserBonus,
            description: 'রেফারেল বোনাস (নতুন ইউজার)',
            timestamp: new Date().toISOString(),
            status: 'completed'
        });
        
        await db.collection('transactions').add({
            user_id: referrerUserId,
            type: 'referral_bonus',
            amount: referrerBonus,
            description: `রেফারেল বোনাস (${userData.first_name || 'নতুন ইউজার'})`,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });
        
        // ✅ STEP 5: Mark as processed
        localStorage.setItem(referralKey, 'true');
        
        // ✅ STEP 6: Reload referral count for current user
        await loadReferralCount();
        
        console.log("✅ রেফারেল প্রসেস সম্পূর্ণ");
        
        // Show success notification
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
        
        await loadReferralCount();
        
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
    
    // Update referral bonus display
    const referralBonus = (userData.total_referrals || 0) * 100;
    const bonusElements = document.querySelectorAll('[id*="ReferralBonus"]');
    bonusElements.forEach(el => {
        el.textContent = `${referralBonus} টাকা`;
    });
    
    updateProgressBars();
    updateResetTimers();
}

// Save withdraw to Firebase
async function saveWithdrawToFirebase(amount, accountNumber, method) {
    try {
        const user = getUserData();
        if (!user) {
            throw new Error('User data not available');
        }
        
        if (!db) {
            throw new Error('Firebase not available');
        }
        
        const withdrawData = {
            user_id: user.id,
            user_name: user.first_name || 'ইউজার',
            amount: parseFloat(amount),
            account_number: accountNumber,
            method: method,
            status: 'pending',
            requested_at: new Date().toISOString(),
            processed_at: null,
            transaction_id: `TX${Date.now()}`
        };
        
        // Save to Firebase
        await db.collection('withdrawals').add(withdrawData);
        
        // Log transaction
        await db.collection('transactions').add({
            user_id: user.id,
            type: 'withdrawal_request',
            amount: parseFloat(amount),
            description: `${method} উত্তোলন রিকোয়েস্ট`,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        
        console.log("✅ Withdraw request saved to Firebase");
        return true;
        
    } catch (error) {
        console.error("❌ Error saving withdrawal:", error);
        throw error;
    }
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

// Test referral function
async function testReferralSystem() {
    console.log("🔧 টেস্টিং রেফারেল সিস্টেম...");
    
    const testReferrerId = "test_referrer_123";
    const testUserData = {
        id: "test_user_" + Date.now(),
        first_name: "টেস্ট ইউজার",
        balance: 50,
        today_ads: 0,
        total_ads: 0,
        total_referrals: 0,
        total_income: 50
    };
    
    // Temporarily set user data for testing
    const originalUserData = userData;
    userData = testUserData;
    
    try {
        // Test creating a referral
        console.log("🎯 টেস্ট রেফারেল শুরু...");
        
        // Create test referral record
        const referralData = {
            user_id: testUserData.id,
            user_name: testUserData.first_name,
            referred_by: testReferrerId,
            referrer_name: "টেস্ট রেফারার",
            join_date: new Date().toISOString(),
            timestamp: Date.now(),
            status: 'completed',
            new_user_bonus: 50,
            referrer_bonus: 100
        };
        
        if (db) {
            await db.collection('referrals').add(referralData);
            console.log("✅ টেস্ট রেফারেল রেকর্ড তৈরি হয়েছে");
            
            // Update test referrer's balance
            const referrerDoc = await db.collection('users').doc(testReferrerId).get();
            if (referrerDoc.exists) {
                const referrer = referrerDoc.data();
                await db.collection('users').doc(testReferrerId).update({
                    balance: (referrer.balance || 0) + 100,
                    total_income: (referrer.total_income || 0) + 100,
                    total_referrals: (referrer.total_referrals || 0) + 1
                });
                console.log("✅ টেস্ট রেফারারের ব্যালেন্স ১০০ টাকা বাড়ানো হয়েছে");
            }
        }
        
        console.log("✅ রেফারেল টেস্ট সম্পন্ন");
        showNotification("✅ রেফারেল টেস্ট সম্পন্ন! ১০০ টাকা রেফারারকে যোগ করা হয়েছে।", "success");
        
    } catch (error) {
        console.error("❌ রেফারেল টেস্ট ব্যর্থ:", error);
        showNotification("❌ রেফারেল টেস্ট ব্যর্থ: " + error.message, "error");
    } finally {
        // Restore original user data
        userData = originalUserData;
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🎯 Starting app initialization...");
    
    // Load Firebase SDKs
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
                // Initialize Firebase
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                db = firebase.firestore();
                
                console.log("✅ Firebase initialized successfully");
                
                // Initialize user data
                setTimeout(async () => {
                    await initializeUserData();
                    
                    // Update UI periodically
                    setInterval(() => {
                        if (userData) {
                            updateAllPagesUI();
                        }
                    }, 30000);
                    
                    // Daily reset check
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
window.testReferralSystem = testReferralSystem;