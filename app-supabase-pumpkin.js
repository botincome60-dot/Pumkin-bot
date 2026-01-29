// app-supabase-pumpkin.js - মিষ্টি কুমড়া বট - ULTIMATE REFERRAL FIX
console.log("🎃 মিষ্টি কুমড়া বট লোড হচ্ছে...");

const tg = window.Telegram?.WebApp;

// Supabase Configuration
const SUPABASE_URL = 'https://jomburcicuunoudlzuck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbWJ1cmNpY3V1bm91ZGx6dWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTQxMDIsImV4cCI6MjA4MTI3MDEwMn0.l-WwL-uBnDbQBzeux_CfIXpAphoV3RcdhPA7qBRmu4Y';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global user data
let userData = null;

// ✅ CORRECT Referral Link Format: https://t.me/mishti_kumra_bot/app?startapp=ref8254041380
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

// Initialize user data
async function initializeUserData() {
    console.log("🔄 ইউজার ডেটা ইনিশিয়ালাইজ হচ্ছে...");
    
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
                const { data: serverData, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (!error && serverData) {
                    userData = { ...serverData, ...localUserData };
                }
            } catch (syncError) {
                console.log("⚠️ Supabase sync failed");
            }
        } else {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (user) {
                userData = user;
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
                    join_date: now.toISOString(),
                    last_active: now.toISOString(),
                    referred_by: null,
                    last_daily_reset: now.toISOString()
                };
                
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([userData]);
                
                if (insertError) {
                    console.error("❌ User create error:", insertError);
                }
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

// Update user data
async function updateUserData(updates) {
    if (!userData) return userData;
    
    try {
        Object.assign(userData, updates);
        userData.last_active = new Date().toISOString();
        
        saveUserToLocalStorage(userData);
        
        const { error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', userData.id);
            
        if (error) {
            console.error("❌ Supabase update error:", error);
        }
        
        updateAllPagesUI();
        return userData;
        
    } catch (error) {
        console.error("❌ Update error:", error);
        Object.assign(userData, updates);
        saveUserToLocalStorage(userData);
        updateAllPagesUI();
        return userData;
    }
}

// ✅ FIXED REAL-TIME Referral Count
async function loadReferralCount() {
    if (!userData) return;
    
    console.log("🔍 লোড রেফারেল কাউন্ট...");
    
    try {
        // Method 1: Count from referrals table
        const { data: referrals, error: refError } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_by', userData.id);
        
        if (!refError) {
            const count = referrals ? referrals.length : 0;
            console.log("✅ Referrals table থেকে রেফারেল কাউন্ট:", count);
            
            // Update user data
            if (count !== userData.total_referrals) {
                await supabase
                    .from('users')
                    .update({ total_referrals: count })
                    .eq('id', userData.id);
                
                userData.total_referrals = count;
                saveUserToLocalStorage(userData);
            }
        } else {
            console.error("❌ Referrals table error:", refError);
            
            // Method 2: Get from users table
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('total_referrals')
                .eq('id', userData.id)
                .single();
            
            if (!userError && user) {
                const count = user.total_referrals || 0;
                console.log("✅ Users table থেকে রেফারেল কাউন্ট:", count);
                userData.total_referrals = count;
                saveUserToLocalStorage(userData);
            }
        }
        
    } catch (error) {
        console.error("❌ রেফারেল কাউন্ট এরর:", error);
    }
}

// ✅ FIXED Referral Processing
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
            
            // Validate referrer exists
            const { data: referrer, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', referrerUserId)
                .single();
            
            if (error || !referrer) {
                console.log("❌ রেফারার পাওয়া যায়নি");
                return;
            }
            
            console.log("✅ রেফারার ভ্যালিড:", referrer.first_name);
            
            // Check if referral already exists
            const { data: existingRef } = await supabase
                .from('referrals')
                .select('*')
                .eq('user_id', userData.id)
                .eq('referred_by', referrerUserId);
            
            if (existingRef && existingRef.length > 0) {
                console.log("❌ রেফারেল ইতিমধ্যে আছে");
                localStorage.setItem('referral_processed', 'true');
                return;
            }
            
            // ✅ STEP 1: Create referral record
            const referralData = {
                user_id: userData.id,
                referred_by: referrerUserId,
                referrer_user_id: referrerUserId,
                new_user_name: userData.first_name,
                new_user_id: userData.id,
                join_date: new Date().toISOString(),
                timestamp: Date.now(),
                status: 'completed',
                source: 'telegram_startapp',
                bonus_given: false
            };
            
            const { error: insertError } = await supabase
                .from('referrals')
                .insert([referralData]);
            
            if (insertError) {
                console.error('❌ রেফারেল রেকর্ড এরর:', insertError);
                return;
            }
            
            console.log("✅ রেফারেল রেকর্ড তৈরি হয়েছে");
            
            // ✅ STEP 2: Update current user
            await updateUserData({
                referred_by: referrerUserId,
                balance: userData.balance + 50, // 50 টাকা বোনাস নতুন ইউজারকে
                total_income: userData.total_income + 50
            });
            
            // ✅ STEP 3: Update referrer
            // First count referrals for referrer
            const { data: referrerReferrals } = await supabase
                .from('referrals')
                .select('id')
                .eq('referred_by', referrerUserId);
            
            const newReferralCount = referrerReferrals ? referrerReferrals.length : 0;
            
            // Update referrer's data
            await supabase
                .from('users')
                .update({
                    balance: (referrer.balance || 0) + 100, // 100 টাকা বোনাস রেফারারকে
                    total_income: (referrer.total_income || 0) + 100,
                    total_referrals: newReferralCount,
                    last_active: new Date().toISOString()
                })
                .eq('id', referrerUserId);
            
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

// ... (Rest of the functions remain the same as before - unchanged)

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
window.saveWithdrawToSupabase = saveWithdrawToSupabase;
window.showNotification = showNotification;
window.hideLoading = hideLoading;
window.updateAllPagesUI = updateAllPagesUI;
window.copySupportReferral = copyReferralLink;