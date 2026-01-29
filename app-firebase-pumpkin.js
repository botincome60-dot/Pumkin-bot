// app-firebase-pumpkin.js - মিষ্টি কুমড়া বট - Firebase Version
console.log("🎃 মিষ্টি কুমড়া বট লোড হচ্ছে... (Firebase)");

const tg = window.Telegram?.WebApp;

// Global user data
let userData = null;

// ✅ CORRECT Referral Link Format
function generateReferralLink() {
    if (!userData || !userData.id) return 'https://t.me/mishti_kumra_bot';
    
    const userId = userData.id.toString().replace('test_', '');
    return `https://t.me/mishti_kumra_bot/app?startapp=ref${userId}`;
}

// ✅ CORRECT Referral Link for sharing (simplified)
function generateShareableReferralLink() {
    if (!userData || !userData.id) return 'https://t.me/mishti_kumra_bot';
    
    const userId = userData.id.toString().replace('test_', '');
    return `https://t.me/mishti_kumra_bot?startapp=ref${userId}`;
}

// Initialize user data with Firebase
async function initializeUserData() {
    console.log("🔄 ইউজার ডেটা ইনিশিয়ালাইজ হচ্ছে (Firebase)...");
    
    try {
        if (tg) {
            tg.expand();
            tg.ready();
        }

        let userId;
        if (tg?.initDataUnsafe?.user?.id) {
            userId = tg.initDataUnsafe.user.id.toString();
        } else {
            userId = 'test_' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
        }

        const localUserData = loadUserFromLocalStorage();
        
        if (localUserData && localUserData.id === userId) {
            userData = localUserData;
            
            try {
                // Fetch from Firebase Firestore
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    const serverData = userDoc.data();
                    userData = { ...serverData, ...localUserData };
                    userData.id = userId; // Ensure ID is set
                }
            } catch (syncError) {
                console.log("⚠️ Firebase sync failed:", syncError);
            }
        } else {
            // Check if user exists in Firebase
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                userData = userDoc.data();
                userData.id = userId; // Ensure ID is set
            } else {
                const now = new Date();
                userData = {
                    id: userId,
                    first_name: tg?.initDataUnsafe?.user?.first_name || 'ইউজার',
                    username: tg?.initDataUnsafe?.user?.username || '',
                    balance: 50.00,
                    today_ads: 0,
                    total_ads: 0,
                    today_bonus_ads: 0,
                    today_bonus_ads_2: 0,
                    total_referrals: 0,
                    total_income: 50.00,
                    join_date: firebase.firestore.Timestamp.fromDate(now),
                    last_active: firebase.firestore.Timestamp.fromDate(now),
                    referred_by: null,
                    last_daily_reset: firebase.firestore.Timestamp.fromDate(now)
                };
                
                // Create user in Firebase
                await db.collection('users').doc(userId).set(userData);
                
                console.log("✅ User created in Firebase");
            }
            
            saveUserToLocalStorage(userData);
        }

        await checkAndResetDailyCounters();
        
        // ✅ FIRST: Process referral if any
        await processReferralWithStartApp();
        
        // ✅ SECOND: Load referral count
        await loadReferralCount();
        
        // ✅ THIRD: Update all UI
        updateAllPagesUI();
        
        hideLoading();
        
    } catch (error) {
        console.error("❌ Init error:", error);
        userData = loadUserFromLocalStorage() || {
            id: 'fallback_' + Date.now(),
            first_name: 'ইউজার',
            balance: 50.00,
            today_ads: 0,
            total_ads: 0,
            total_income: 50.00,
            total_referrals: 0,
            last_daily_reset: new Date().toISOString()
        };
        fallbackUI();
        hideLoading();
    }
}

// Update user data in Firebase
async function updateUserData(updates) {
    if (!userData || !userData.id) return userData;
    
    try {
        // Merge updates with existing data
        const updatedData = { ...userData, ...updates };
        updatedData.last_active = firebase.firestore.Timestamp.fromDate(new Date());
        
        // Update local data
        Object.assign(userData, updatedData);
        saveUserToLocalStorage(userData);
        
        // Prepare data for Firebase (remove any undefined values)
        const firebaseData = { ...updatedData };
        delete firebaseData.id; // Don't store ID as a field
        
        // Update in Firebase
        await db.collection('users').doc(userData.id).update(firebaseData);
        
        console.log("✅ Firebase update successful");
        updateAllPagesUI();
        return userData;
        
    } catch (error) {
        console.error("❌ Firebase update error:", error);
        
        // Fallback: Update local only
        Object.assign(userData, updates);
        saveUserToLocalStorage(userData);
        updateAllPagesUI();
        return userData;
    }
}

// ✅ FIXED REAL-TIME Referral Count with Firebase
async function loadReferralCount() {
    if (!userData) return;
    
    console.log("🔍 লোড রেফারেল কাউন্ট (Firebase)...");
    
    try {
        // Method 1: Count from referrals collection
        const referralsQuery = await db.collection('referrals')
            .where('referred_by', '==', userData.id)
            .get();
        
        const count = referralsQuery.size;
        console.log("✅ Referrals collection থেকে রেফারেল কাউন্ট:", count);
        
        // Update user data
        if (count !== userData.total_referrals) {
            await db.collection('users').doc(userData.id).update({
                total_referrals: count
            });
            
            userData.total_referrals = count;
            saveUserToLocalStorage(userData);
        }
        
    } catch (error) {
        console.error("❌ রেফারেল কাউন্ট এরর:", error);
        
        // Method 2: Get from users collection
        try {
            const userDoc = await db.collection('users').doc(userData.id).get();
            
            if (userDoc.exists) {
                const user = userDoc.data();
                const count = user.total_referrals || 0;
                console.log("✅ Users collection থেকে রেফারেল কাউন্ট:", count);
                userData.total_referrals = count;
                saveUserToLocalStorage(userData);
            }
        } catch (userError) {
            console.error("❌ Users fetch error:", userError);
        }
    }
}

// ✅ FIXED Referral Processing with Firebase
async function processReferralWithStartApp() {
    if (!userData) return;
    
    try {
        let referralCode = null;
        
        // Check Telegram start parameter
        if (tg?.initDataUnsafe?.start_param) {
            referralCode = tg.initDataUnsafe.start_param;
            console.log("📱 টেলিগ্রাম স্টার্ট প্যারাম:", referralCode);
        }
        
        // Check localStorage for existing referral
        const savedRef = localStorage.getItem('referral_processed');
        if (savedRef === 'true') {
            console.log("✅ রেফারেল ইতিমধ্যে প্রসেস করা হয়েছে");
            return;
        }
        
        if (referralCode && referralCode.startsWith('ref')) {
            const referrerUserId = referralCode.replace('ref', '');
            
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
            
            // Validate referrer exists in Firebase
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
                localStorage.setItem('referral_processed', 'true');
                return;
            }
            
            // ✅ STEP 1: Create referral record in Firebase
            const referralData = {
                user_id: userData.id,
                referred_by: referrerUserId,
                referrer_user_id: referrerUserId,
                new_user_name: userData.first_name,
                new_user_id: userData.id,
                join_date: firebase.firestore.Timestamp.fromDate(new Date()),
                timestamp: Date.now(),
                status: 'completed',
                source: 'telegram_startapp',
                bonus_given: false
            };
            
            await db.collection('referrals').add(referralData);
            
            console.log("✅ রেফারেল রেকর্ড তৈরি হয়েছে (Firebase)");
            
            // ✅ STEP 2: Update current user
            await updateUserData({
                referred_by: referrerUserId,
                balance: userData.balance + 50, // 50 টাকা বোনাস নতুন ইউজারকে
                total_income: userData.total_income + 50
            });
            
            // ✅ STEP 3: Update referrer
            // First count referrals for referrer
            const referrerReferralsQuery = await db.collection('referrals')
                .where('referred_by', '==', referrerUserId)
                .get();
            
            const newReferralCount = referrerReferralsQuery.size;
            
            // Update referrer's data
            await db.collection('users').doc(referrerUserId).update({
                balance: (referrer.balance || 0) + 100, // 100 টাকা বোনাস রেফারারকে
                total_income: (referrer.total_income || 0) + 100,
                total_referrals: newReferralCount,
                last_active: firebase.firestore.Timestamp.fromDate(new Date())
            });
            
            console.log('💰 রেফারারকে ১০০ টাকা বোনাস দেওয়া হয়েছে');
            
            // ✅ STEP 4: Mark as processed
            localStorage.setItem('referral_processed', 'true');
            
            // ✅ STEP 5: Reload referral count for referrer
            if (referrerUserId === userData.id) {
                await loadReferralCount();
            }
            
            console.log("✅ রেফারেল প্রসেস সম্পূর্ণ");
            
            // Show success notification
            setTimeout(() => {
                showNotification('🎉 রেফারেল সফল! আপনি ৫০ টাকা বোনাস পেয়েছেন!', 'success');
            }, 1500);
        }
        
    } catch (error) {
        console.error('❌ রেফারেল এরর:', error);
    }
}

// ✅ Copy referral link function
async function copyReferralLink() {
    if (!userData) {
        alert('ডেটা লোড হয়নি। রিফ্রেশ করুন।');
        return;
    }
    
    const refLink = generateReferralLink();
    const shareLink = generateShareableReferralLink();
    
    try {
        await navigator.clipboard.writeText(shareLink);
        
        // Force reload referral count
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
    
    // Generate both links
    const fullRefLink = generateReferralLink();
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
        'referralLink': simpleRefLink, // Use simple link for display
        'supportReferralLink': simpleRefLink,
        'profileUserId': userData.id ? userData.id.toString().replace('test_', '').substring(0, 8) : '০'
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
    updateNavigationActiveState();
}

// Save withdraw to Firebase
async function saveWithdrawToFirebase(amount, accountNumber, method) {
    try {
        const user = getUserData();
        if (!user) return;
        
        const withdrawData = {
            user_id: user.id,
            amount: amount,
            account_number: accountNumber,
            method: method,
            status: 'pending',
            requested_at: firebase.firestore.Timestamp.fromDate(new Date()),
            user_name: user.first_name || 'ইউজার',
            processed_at: null,
            transaction_id: null
        };
        
        // Save to Firebase
        await db.collection('withdrawals').add(withdrawData);
        
        // Log transaction
        await db.collection('transactions').add({
            user_id: user.id,
            type: 'withdrawal',
            amount: amount,
            description: `${method} উত্তোলন`,
            timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
            status: 'pending'
        });
        
        console.log("✅ Withdraw request saved to Firebase");
        return true;
        
    } catch (error) {
        console.error("❌ Error saving withdrawal:", error);
        throw error;
    }
}

// Helper functions (keep existing)
function getUserData() {
    return userData;
}

function loadUserFromLocalStorage() {
    try {
        const saved = localStorage.getItem('userData_local');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

function saveUserToLocalStorage(data) {
    try {
        localStorage.setItem('userData_local', JSON.stringify(data));
    } catch (e) {
        console.error("LocalStorage save error:", e);
    }
}

async function checkAndResetDailyCounters() {
    try {
        const today = new Date().toDateString();
        const lastReset = userData.last_daily_reset;
        
        // Convert Firebase Timestamp to Date if needed
        const lastResetDate = lastReset?.toDate ? lastReset.toDate() : new Date(lastReset);
        
        if (lastResetDate.toDateString() !== today) {
            console.log("🔄 রিসেটিং ডেইলি কাউন্টার...");
            
            await updateUserData({
                today_ads: 0,
                today_bonus_ads: 0,
                today_bonus_ads_2: 0,
                last_daily_reset: firebase.firestore.Timestamp.fromDate(new Date())
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
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}ঘ ${diffMinutes}মি`;
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
    // Implementation based on your existing code
}

function updateResetTimers() {
    // Implementation based on your existing code
}

function updateNavigationActiveState() {
    // Implementation based on your existing code
}

function showNotification(message, type = 'info') {
    // Implementation based on your existing code
    alert(message); // Simple fallback
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function fallbackUI() {
    // Simple fallback UI
    const elements = document.querySelectorAll('[id]');
    elements.forEach(el => {
        if (el.id.includes('Balance')) el.textContent = '50.00 টাকা';
        if (el.id.includes('Referral')) el.textContent = '০';
        if (el.id.includes('Income')) el.textContent = '50.00 টাকা';
    });
}

// ✅ Add this new function to refresh referral count periodically
function startReferralCountRefresh() {
    // Refresh referral count every 30 seconds
    setInterval(async () => {
        if (userData) {
            await loadReferralCount();
            updateAllPagesUI();
        }
    }, 30000);
}

// ✅ Initialize everything on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load Firebase SDKs first
    const firebaseScript = document.createElement('script');
    firebaseScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js";
    document.head.appendChild(firebaseScript);
    
    firebaseScript.onload = function() {
        const authScript = document.createElement('script');
        authScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js";
        document.head.appendChild(authScript);
        
        authScript.onload = function() {
            const firestoreScript = document.createElement('script');
            firestoreScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js";
            document.head.appendChild(firestoreScript);
            
            firestoreScript.onload = function() {
                const storageScript = document.createElement('script');
                storageScript.src = "https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js";
                document.head.appendChild(storageScript);
                
                storageScript.onload = function() {
                    // Now load Firebase config
                    const configScript = document.createElement('script');
                    configScript.src = "firebase-config.js";
                    document.head.appendChild(configScript);
                    
                    configScript.onload = function() {
                        setTimeout(async () => {
                            await initializeUserData();
                            
                            // Start periodic refresh
                            startReferralCountRefresh();
                            
                            // Daily reset check
                            setInterval(async () => {
                                if (userData) {
                                    await checkAndResetDailyCounters();
                                    updateAllPagesUI();
                                }
                            }, 300000);
                            
                            // UI update interval
                            setInterval(() => {
                                if (userData) updateAllPagesUI();
                            }, 30000);
                        }, 1000);
                    };
                };
            };
        };
    };
});

// Export functions to window
window.copyReferralLink = copyReferralLink;
window.getUserData = getUserData;
window.updateUserData = updateUserData;
window.canWatchMoreAds = canWatchMoreAds;
window.getTimeUntilNextReset = getTimeUntilNextReset;
window.canWatchMoreBonusAds = canWatchMoreBonusAds;
window.getTimeUntilNextBonusReset = getTimeUntilNextBonusReset;
window.canWatchMoreBonusAds2 = canWatchMoreBonusAds2;
window.getTimeUntilNextBonusReset2 = getTimeUntilNextBonusReset2;
window.saveWithdrawToSupabase = saveWithdrawToFirebase; // Keep same name for compatibility
window.showNotification = showNotification;
window.hideLoading = hideLoading;
window.updateAllPagesUI = updateAllPagesUI;
window.copySupportReferral = copyReferralLink;