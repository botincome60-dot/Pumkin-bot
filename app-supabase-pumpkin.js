// app-supabase-pumpkin.js - মিষ্টি কুমড়া বট
console.log("🎃 মিষ্টি কুমড়া বট লোড হচ্ছে...");

const tg = window.Telegram?.WebApp;

// নতুন Supabase Configuration - YOUR NEW CREDENTIALS
const SUPABASE_URL = 'https://jomburcicuunoudlzuck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbWJ1cmNpY3V1bm91ZGx6dWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTQxMDIsImV4cCI6MjA4MTI3MDEwMn0.l-WwL-uBnDbQBzeux_CfIXpAphoV3RcdhPA7qBRmu4Y';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global user data
let userData = null;

// Initialize user data
async function initializeUserData() {
    console.log("🔄 ইউজার ডেটা ইনিশিয়ালাইজ হচ্ছে...");
    
    try {
        // Expand Telegram Web App
        if (tg) {
            tg.expand();
            tg.ready();
            console.log("✅ টেলিগ্রাম ওয়েব এপ ইনিশিয়ালাইজড");
        }

        // Get user ID from Telegram or create test ID
        let userId;
        if (tg?.initDataUnsafe?.user?.id) {
            userId = tg.initDataUnsafe.user.id.toString();
            console.log("📱 টেলিগ্রাম ইউজার আইডি:", userId);
        } else {
            // Generate random ID for browser testing
            userId = 'test_' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
            console.log("🖥️ টেস্ট ইউজার আইডি:", userId);
        }

        // Get user data from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error("❌ সাপাবেস এরর:", error);
            throw error;
        }
        
        if (user) {
            userData = user;
            console.log("✅ ইউজার ডেটা লোডেড:", userData);
            
            // Check and reset hourly ads if needed
            await checkAndResetHourlyAds();
            await checkAndResetBonusAds();
            await checkAndResetBonusAds2();
        } else {
            // Create new user
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
                join_date: new Date().toISOString(),
                last_active: new Date().toISOString(),
                referred_by: null,
                last_ad_reset: new Date().toISOString(),
                last_bonus_ad_reset: new Date().toISOString(),
                last_bonus_ad_reset_2: new Date().toISOString()
            };
            
            const { error: insertError } = await supabase
                .from('users')
                .insert([userData]);
            
            if (insertError) {
                console.error("❌ ইউজার ক্রিয়েট এরর:", insertError);
                throw insertError;
            }
            
            console.log("✅ নতুন ইউজার ক্রিয়েটেড");
        }

        // Update UI immediately
        updateUI();
        
        // Process referral
        await processReferralWithStartApp();
        
        // Load referral count
        await loadReferralCount();
        
        console.log("✅ ইউজার ইনিশিয়ালাইজেশন কমপ্লিট");
        hideLoading();
        
    } catch (error) {
        console.error("❌ ইউজার ডেটা এরর:", error);
        fallbackUI();
        hideLoading();
    }
}

// Check and reset hourly ads for main ads
async function checkAndResetHourlyAds() {
    if (!userData) return;
    
    try {
        const lastReset = new Date(userData.last_ad_reset || userData.join_date);
        const now = new Date();
        const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
        
        console.log(`🕒 লাস্ট এড রিসেট: ${lastReset}`);
        
        // Reset if 1 hour has passed since last reset
        if (hoursDiff >= 1) {
            console.log('🔄 রিসেটিং এড কাউন্টার');
            
            await updateUserData({
                today_ads: 0,
                last_ad_reset: now.toISOString()
            });
            
            console.log('✅ এড কাউন্টার রিসেটেড');
        }
        
    } catch (error) {
        console.error('❌ এড রিসেট এরর:', error);
    }
}

// Check and reset hourly ads for bonus ads
async function checkAndResetBonusAds() {
    if (!userData) return;
    
    try {
        const lastReset = new Date(userData.last_bonus_ad_reset || userData.join_date);
        const now = new Date();
        const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
        
        // Reset if 1 hour has passed since last reset
        if (hoursDiff >= 1) {
            console.log('🔄 বোনাস এড রিসেটিং');
            
            await updateUserData({
                today_bonus_ads: 0,
                last_bonus_ad_reset: now.toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ বোনাস এড রিসেট এরর:', error);
    }
}

// Check and reset hourly ads for bonus ads 2
async function checkAndResetBonusAds2() {
    if (!userData) return;
    
    try {
        const lastReset = new Date(userData.last_bonus_ad_reset_2 || userData.join_date);
        const now = new Date();
        const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
        
        // Reset if 1 hour has passed since last reset
        if (hoursDiff >= 1) {
            console.log('🔄 বোনাস এড ২ রিসেটিং');
            
            await updateUserData({
                today_bonus_ads_2: 0,
                last_bonus_ad_reset_2: now.toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ বোনাস এড ২ রিসেট এরর:', error);
    }
}

// Check if user can watch more main ads
function canWatchMoreAds() {
    if (!userData) return false;
    
    const lastReset = new Date(userData.last_ad_reset || userData.join_date);
    const now = new Date();
    const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
    
    // If 1 hour has passed, user can watch ads again
    if (hoursDiff >= 1) {
        return true;
    }
    
    // Check if user hasn't reached the hourly limit
    return userData.today_ads < 10;
}

// Check if user can watch more bonus ads
function canWatchMoreBonusAds() {
    if (!userData) return false;
    
    const lastReset = new Date(userData.last_bonus_ad_reset || userData.join_date);
    const now = new Date();
    const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
    
    // If 1 hour has passed, user can watch bonus ads again
    if (hoursDiff >= 1) {
        return true;
    }
    
    // Check if user hasn't reached the hourly limit
    return (userData.today_bonus_ads || 0) < 10;
}

// Check if user can watch more bonus ads 2
function canWatchMoreBonusAds2() {
    if (!userData) return false;
    
    const lastReset = new Date(userData.last_bonus_ad_reset_2 || userData.join_date);
    const now = new Date();
    const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
    
    // If 1 hour has passed, user can watch bonus ads again
    if (hoursDiff >= 1) {
        return true;
    }
    
    // Check if user hasn't reached the hourly limit
    return (userData.today_bonus_ads_2 || 0) < 10;
}

// Get time until next reset for main ads
function getTimeUntilNextReset() {
    if (!userData) return 'লোড হচ্ছে...';
    
    const lastReset = new Date(userData.last_ad_reset || userData.join_date);
    const now = new Date();
    const nextReset = new Date(lastReset.getTime() + (60 * 60 * 1000));
    const timeDiff = nextReset - now;
    
    if (timeDiff <= 0) {
        return 'এখনই রিসেট হবে';
    }
    
    const minutes = Math.ceil(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ঘন্টা ${remainingMinutes} মিনিট`;
    } else {
        return `${minutes} মিনিট`;
    }
}

// Get time until next reset for bonus ads
function getTimeUntilNextBonusReset() {
    if (!userData) return 'লোড হচ্ছে...';
    
    const lastReset = new Date(userData.last_bonus_ad_reset || userData.join_date);
    const now = new Date();
    const nextReset = new Date(lastReset.getTime() + (60 * 60 * 1000));
    const timeDiff = nextReset - now;
    
    if (timeDiff <= 0) {
        return 'এখনই রিসেট হবে';
    }
    
    const minutes = Math.ceil(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ঘন্টা ${remainingMinutes} মিনিট`;
    } else {
        return `${minutes} মিনিট`;
    }
}

// Get time until next reset for bonus ads 2
function getTimeUntilNextBonusReset2() {
    if (!userData) return 'লোড হচ্ছে...';
    
    const lastReset = new Date(userData.last_bonus_ad_reset_2 || userData.join_date);
    const now = new Date();
    const nextReset = new Date(lastReset.getTime() + (60 * 60 * 1000));
    const timeDiff = nextReset - now;
    
    if (timeDiff <= 0) {
        return 'এখনই রিসেট হবে';
    }
    
    const minutes = Math.ceil(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ঘন্টা ${remainingMinutes} মিনিট`;
    } else {
        return `${minutes} মিনিট`;
    }
}

// PROCESS REFERRAL WITH STARTAPP
async function processReferralWithStartApp() {
    if (!userData) return;
    
    try {
        console.log('🔍 রেফারেল প্রসেসিং...');
        
        let referralCode = null;
        
        // METHOD 1: Check Telegram start_param
        if (tg?.initDataUnsafe?.start_param) {
            referralCode = tg.initDataUnsafe.start_param;
            console.log('🎯 রেফারেল কোড:', referralCode);
        }
        
        // METHOD 2: Check URL parameters for startapp (web testing)
        if (!referralCode) {
            const urlParams = new URLSearchParams(window.location.search);
            referralCode = urlParams.get('startapp') || urlParams.get('start');
            console.log('🌐 URL থেকে রেফারেল কোড:', referralCode);
        }
        
        if (referralCode && referralCode.startsWith('ref')) {
            const referrerUserId = referralCode.replace('ref', '');
            console.log('🔄 রেফারেল প্রসেসিং:', referrerUserId);
            
            // Validate the referral
            if (await validateReferral(referrerUserId)) {
                // Create referral record
                await createReferralRecord(referrerUserId);
                
                // Give bonuses to both users
                await giveReferralBonuses(referrerUserId);
                
                console.log('✅ রেফারেল সফল!');
                
                // Show success message
                showNotification(
                    '🎉 রেফারেল সফল!\n\nআপনি রেফারেল দ্বারা জয়েন করেছেন। ৫০ টাকা বোনাস পেয়েছেন!',
                    'success'
                );
            }
        }
        
    } catch (error) {
        console.error('❌ রেফারেল প্রসেসিং এরর:', error);
    }
}

// Validate referral
async function validateReferral(referrerUserId) {
    // Check self-referral
    if (referrerUserId === userData.id) {
        console.log('🚫 সেল্ফ-রেফারেল ডিটেক্টেড');
        return false;
    }
    
    // Check if user already has a referrer
    if (userData.referred_by) {
        console.log('✅ ইউজার ইতিমধ্যে রেফার্ড:', userData.referred_by);
        return false;
    }
    
    // Check if referral already exists
    const { data: existingRef, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', userData.id);
        
    if (existingRef && existingRef.length > 0) {
        console.log('✅ রেফারেল ইতিমধ্যে এক্সিস্টস');
        return false;
    }
    
    return true;
}

// Create referral record
async function createReferralRecord(referrerUserId) {
    const referralData = {
        user_id: userData.id,
        referred_by: referrerUserId,
        referrer_user_id: referrerUserId,
        new_user_name: userData.first_name,
        new_user_id: userData.id,
        join_date: new Date().toISOString(),
        timestamp: Date.now(),
        status: 'completed',
        source: 'telegram_startapp'
    };
    
    const { error } = await supabase
        .from('referrals')
        .insert([referralData]);
    
    if (error) {
        console.error('রেফারেল রেকর্ড এরর:', error);
        throw error;
    }
    
    // Update user with referrer info
    await updateUserData({
        referred_by: referrerUserId
    });
}

// Give referral bonuses
async function giveReferralBonuses(referrerUserId) {
    // Give 50 BDT to new user
    await updateUserData({
        balance: userData.balance + 50,
        total_income: userData.total_income + 50
    });
    
    // Give 100 BDT to referrer
    const { data: referrer, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', referrerUserId)
        .single();
    
    if (referrer) {
        await supabase
            .from('users')
            .update({
                balance: (referrer.balance || 0) + 100,
                total_income: (referrer.total_income || 0) + 100,
                total_referrals: (referrer.total_referrals || 0) + 1
            })
            .eq('id', referrerUserId);
    } else {
        // Create new document for referrer if doesn't exist
        await supabase
            .from('users')
            .insert([{
                id: referrerUserId,
                first_name: 'রেফারার',
                balance: 100,
                total_income: 100,
                total_referrals: 1,
                join_date: new Date().toISOString(),
                last_active: new Date().toISOString(),
                last_ad_reset: new Date().toISOString(),
                last_bonus_ad_reset: new Date().toISOString(),
                last_bonus_ad_reset_2: new Date().toISOString()
            }]);
    }
}

// Load referral count from Supabase
async function loadReferralCount() {
    if (!userData) return;
    
    try {
        const { data: referrals, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_by', userData.id);
        
        const count = referrals ? referrals.length : 0;
        if (count !== userData.total_referrals) {
            await updateUserData({ total_referrals: count });
        }
    } catch (error) {
        console.error("❌ রেফারেল কাউন্ট লোডিং এরর:", error);
    }
}

// Generate referral link
function generateReferralLink() {
    if (!userData) return 'লোড হচ্ছে...';
    return `https://t.me/mishti_kumra_bot?startapp=ref${userData.id}`;
}

// Copy referral link
async function copyReferralLink() {
    if (!userData) {
        alert('ডেটা লোড হয়নি। রিফ্রেশ করুন।');
        return;
    }
    
    const refLink = generateReferralLink();
    
    try {
        await navigator.clipboard.writeText(refLink);
        await loadReferralCount();
        
        showNotification(
            `✅ রেফারেল লিঙ্ক কপি হয়েছে!\n\nআপনার রেফারেল: ${userData.total_referrals} জন`, 
            'success'
        );
        
    } catch (error) {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = refLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        showNotification(
            `✅ রেফারেল লিঙ্ক কপি হয়েছে!\n\nআপনার রেফারেল: ${userData.total_referrals} জন`, 
            'success'
        );
    }
}

// Update user data in Supabase
async function updateUserData(updates) {
    if (!userData) return;
    
    try {
        Object.assign(userData, updates);
        userData.last_active = new Date().toISOString();
        
        const { error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', userData.id);
            
        if (error) {
            console.error("❌ ইউজার ডেটা আপডেট এরর:", error);
            throw error;
        }
        
        updateUI();
        return userData;
    } catch (error) {
        console.error("❌ ইউজার ডেটা আপডেট এরর:", error);
    }
}

// Get user data
function getUserData() {
    return userData;
}

// Update UI with user data
function updateUI() {
    if (!userData) return;
    
    const elements = {
        'userName': userData.first_name,
        'profileName': userData.first_name,
        'mainBalance': userData.balance.toFixed(2) + ' টাকা',
        'withdrawBalance': userData.balance.toFixed(2) + ' টাকা',
        'todayAds': userData.today_ads + '/১০',
        'adsCounter': userData.today_ads + '/১০',
        'bonusAdsCount': (userData.today_bonus_ads || 0) + '/১০',
        'bonusAdsCount2': (userData.today_bonus_ads_2 || 0) + '/১০',
        'totalReferrals': userData.total_referrals,
        'totalReferrals2': userData.total_referrals,
        'totalAds': userData.total_ads,
        'profileTotalAds': userData.total_ads,
        'totalIncome': userData.total_income.toFixed(2) + ' টাকা',
        'profileTotalIncome': userData.total_income.toFixed(2) + ' টাকা',
        'referralLink': generateReferralLink(),
        'supportReferralLink': generateReferralLink(),
        'profileUserId': userData.id,
        'profileReferrals': userData.total_referrals
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    // Update progress bars
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = (userData.today_ads / 10) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    const bonusProgressBar = document.getElementById('bonusProgressBar');
    if (bonusProgressBar) {
        const bonusProgress = ((userData.today_bonus_ads || 0) / 10) * 100;
        bonusProgressBar.style.width = `${bonusProgress}%`;
    }
    
    const bonusProgressBar2 = document.getElementById('bonusProgressBar2');
    if (bonusProgressBar2) {
        const bonusProgress2 = ((userData.today_bonus_ads_2 || 0) / 10) * 100;
        bonusProgressBar2.style.width = `${bonusProgress2}%`;
    }
    
    // Update ads remaining for main ads
    const adsRemaining = document.getElementById('adsRemaining');
    if (adsRemaining) {
        const remaining = 10 - userData.today_ads;
        adsRemaining.textContent = remaining > 0 ? remaining : 0;
    }
}

// Save withdrawal to Supabase
async function saveWithdrawToSupabase(amount, accountNumber, methodName) {
    if (!userData) return;
    
    try {
        const withdrawData = {
            user_id: userData.id,
            user_name: userData.first_name,
            amount: amount,
            account_number: accountNumber,
            method: methodName,
            status: 'pending',
            request_date: new Date().toISOString(),
            timestamp: Date.now(),
            user_ads: userData.total_ads,
            user_referrals: userData.total_referrals
        };
        
        const { error } = await supabase
            .from('withdrawals')
            .insert([withdrawData]);
            
        if (error) {
            console.error('উইথড্র রিকোয়েস্ট সেভ এরর:', error);
            throw error;
        }
        
        console.log('✅ উইথড্র রিকোয়েস্ট সেভড');
    } catch (error) {
        console.error('উইথড্র রিকোয়েস্ট সেভ এরর:', error);
        throw error;
    }
}

// Fallback UI
function fallbackUI() {
    const elements = {
        'userName': 'ইউজার',
        'profileName': 'ইউজার',
        'mainBalance': '৫০.০০ টাকা',
        'withdrawBalance': '৫০.০০ টাকা',
        'todayAds': '০/১০',
        'adsCounter': '০/১০',
        'bonusAdsCount': '০/১০',
        'bonusAdsCount2': '০/১০',
        'totalReferrals': '০',
        'totalReferrals2': '০',
        'totalAds': '০',
        'profileTotalAds': '০',
        'totalIncome': '৫০.০০ টাকা',
        'profileTotalIncome': '৫০.০০ টাকা',
        'referralLink': 'লোড হচ্ছে...',
        'supportReferralLink': 'লোড হচ্ছে...',
        'profileUserId': '০',
        'profileReferrals': '০'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const title = type === 'success' ? 'সফল!' : 
                 type === 'error' ? 'ত্রুটি!' : 
                 type === 'warning' ? 'সতর্কতা!' : 'মেসেজ';
    
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.showPopup({
            title: title,
            message: message,
            buttons: [{ type: 'close' }]
        });
    } else {
        alert(message);
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("🎃 DOM লোডেড, এপ ইনিশিয়ালাইজিং...");
    setTimeout(initializeUserData, 1000);
});

// Export functions to global scope
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