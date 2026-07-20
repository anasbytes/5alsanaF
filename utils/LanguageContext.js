import React, { createContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';

export const LanguageContext = createContext();

const translations = {
    en: {
        // Nav
        nav_home: "Home",
        nav_search: "Search",
        nav_bookings: "Bookings",
        nav_account: "Account",
        nav_facilities: "My Facilities",

        // Home & General
        your_location: "Your Location",
        map_view: "Map View",
        sort_closest: "Sort by Closest",
        no_facilities: "No facilities found.",
        change_location: "Change Location",
        save_location: "Save Location",
        use_current: "Use My Current Location",
        egp: "EGP",
        host: "HOST",
        player: "PLAYER",

        // Search
        discover: "Discover",
        find_perfect_place: "Find the perfect place to play",
        search_placeholder: "Search by name or location...",
        lowest_price: "Lowest Price",
        highest_price: "Highest Price",

        // Facility Details
        available: "AVAILABLE",
        busy: "BUSY",
        details: "Details",
        request_book: "Request to Book",
        cancel_request: "Cancel Request",
        send_request: "Send Request",
        start_time: "Start Time",
        end_time: "End Time",
        request_sent: "Request Sent! Waiting for host approval.",
        booking_failed: "Failed to book: ",
        server_error: "Something went wrong connecting to the server.",
        cancel_confirm_msg: "Are you sure you want to cancel your request for",
        unnamed_facility: "Unnamed Facility",
        no_keep_it: "No, keep it",
        yes_cancel: "Yes, cancel it",
        request_cancelled_success: "Your request has been cancelled.",
        cancel_failed: "Failed to cancel. Please try again.",
        egp_hr: "EGP / hr",
        no_valid_slots: "No valid slots available based on selection.",
        back: "Back",
        general: "GENERAL",
        location_not_provided: "Location not provided",
        select_date: "Select Date",
        select_time: "Select Time",

        // Map
        explore_map: "Explore Map",
        tap_to_view: "Tap to view",
        km_away: "km away",
        no_pitches_nearby: "No pitches nearby",
        no_facilities_10km: "There are no facilities within 10 km of your current location.",

        // Facility Types (Supports both your formats)
        type_all: "All",
        type_football: "Football",
        type_basketball: "Basketball",
        type_padel: "Padel",
        type_ping_pong: "Ping Pong",
        type_playstation: "Playstation",
        football: "Football",
        basketball: "Basketball",
        padel: "Padel",
        "ping pong": "Ping Pong",
        playstation: "Playstation",

        // My Facilities Screen
        add_facility: "Add Facility",
        no_facilities_listed: "No facilities listed yet.",
        tap_add_facility_hint: "Tap 'Add Facility' to start accepting bookings.",
        edit_facility: "Edit Facility",
        new_facility: "New Facility",
        facility_photo: "Facility Photo",
        upload_a_photo: "Upload a photo",
        facility_name: "Facility Name",
        facility_name_placeholder: "e.g. Gezira Football Pitch",
        facility_type: "Facility Type",
        location_label: "Location",
        pick_on_map: "Pick on Map",
        location_placeholder: "Tap 'Pick on Map' to set exact location",
        description_optional: "Description (Optional)",
        description_placeholder: "e.g. Balls provided, parking available, enter through gate 3...",
        price_per_hour: "Price per Hour (EGP)",
        price_placeholder: "e.g. 250",
        save_changes: "Save Changes",
        create_facility: "Create Facility",
        edit_details: "Edit Details",
        delete_facility_title: "Delete Facility",
        delete_facility_confirm: 'Are you sure you want to permanently delete "{name}"?',
        cancel: "Cancel",
        delete: "Delete",
        delete_account: "Delete Account",
        delete_account_confirm: "Are you sure you want to permanently delete your account? This action cannot be undone.",
        account_deleted_success: "Your account has been permanently deleted.",
        missing_info: "Missing Info",
        fill_required_fields: "Please fill out all required fields.",
        missing_location: "Missing Location",
        pick_on_map_hint: 'Please tap "Pick on Map" to drop a pin for your facility.',
        invalid_price: "Invalid Price",
        invalid_price_message: "Please enter a valid number for the price.",
        error_generic: "Error",
        something_went_wrong: "Something went wrong.",
        network_error: "Network Error",
        no_internet: "No Internet Connection",
        check_connection: "Please check your connection.",
        permission_denied: "Permission Denied",
        need_location_access: "We need location access to find you.",
        drop_a_pin: "Drop a Pin",
        tap_map_hint: "Tap anywhere on the map to place your facility's pin.",
        confirm_location: "Confirm Location",

        // Search Screen
        closest_to_me: "Closest to Me",
        sort_default: "Default",
        no_match_search: "No facilities match your search.",
        connection_error_title: "Connection Error",
        connection_error_message: "We couldn't load the facilities.",
        location_access_required_title: "Location Access Required",
        location_access_required_message: "Please allow location access to sort by distance.",
        km_short: "km",

        // Account Screen
        profile: "Profile",
        hello: "Hello",
        account_details: "Account Details",
        username: "Username",
        phone_number: "Phone Number",
        password: "Password",
        new_password: "New password",
        confirm_password: "Confirm password",
        settings: "Settings",
        log_out: "Log Out",
        logout_confirm: "Are you sure you want to log out?",
        success: "Success",
        details_updated: "Your details have been updated.",
        passwords_not_match: "Passwords do not match.",
        password_length: "Password must be at least 6 characters.",
        error: "Error",

        // Bookings
        my_bookings: "My Bookings",
        no_bookings_yet: "You haven't booked anything yet.",
        track_bookings: "Track your requests and sessions",
        date: "Date",
        time: "Time",
        cancelled: "CANCELLED",
        pending: "PENDING",
        active: "ACTIVE",
        completed: "COMPLETED",
        confirmed: "CONFIRMED",

        // Host Bookings & Dashboard
        my_facilities: "My Facilities",
        requests: "Requests",
        player_label: "Player:",
        total_label: "Total:",
        no_requests: "No incoming requests.",
        requests_appear_here: "Bookings will appear here.",
        accept_booking: "Accept Booking",
        decline_booking: "Decline Booking",
        confirm_accept: "accept",
        confirm_decline: "decline",
        are_you_sure: "Are you sure you want to",
        booking_for: "this booking for",
        update_failed: "Failed to update booking status.",
        accept: "Accept",
        decline: "Decline",
    },
    ar: {
        // Nav
        nav_home: "الرئيسية",
        nav_search: "البحث",
        nav_bookings: "حجوزاتي",
        nav_account: "حسابي",
        nav_facilities: "ملاعبي",

        // Home & General
        your_location: "موقعك",
        map_view: "عرض الخريطة",
        sort_closest: "الأقرب لي",
        no_facilities: "لا توجد ملاعب.",
        change_location: "تغيير الموقع",
        save_location: "حفظ الموقع",
        use_current: "استخدم موقعي الحالي",
        egp: "جنيه",
        host: "مضيف",
        player: "لاعب",

        // Search
        discover: "اكتشف",
        find_perfect_place: "ابحث عن المكان المثالي للعب",
        search_placeholder: "ابحث بالاسم أو الموقع...",
        lowest_price: "الأقل سعراً",
        highest_price: "الأعلى سعراً",

        // Facility Details
        available: "متاح",
        busy: "مشغول",
        details: "التفاصيل",
        request_book: "طلب حجز",
        cancel_request: "إلغاء الطلب",
        send_request: "إرسال الطلب",
        start_time: "وقت البدء",
        end_time: "وقت الانتهاء",
        request_sent: "تم إرسال الطلب! في انتظار موافقة المضيف.",
        booking_failed: "فشل الحجز: ",
        server_error: "حدث خطأ في الاتصال بالخادم.",
        cancel_confirm_msg: "هل أنت متأكد أنك تريد إلغاء طلبك لـ",
        unnamed_facility: "ملعب غير مسمى",
        no_keep_it: "لا، احتفظ به",
        yes_cancel: "نعم، ألغه",
        request_cancelled_success: "تم إلغاء طلبك بنجاح.",
        cancel_failed: "فشل الإلغاء. يرجى المحاولة مرة أخرى.",
        no_internet: "لا يوجد اتصال بالإنترنت",
        egp_hr: "جنيه / ساعة",
        no_valid_slots: "لا توجد أوقات متاحة بناءً على اختيارك.",
        back: "رجوع",
        general: "عام",
        location_not_provided: "الموقع غير متوفر",
        select_date: "اختر التاريخ",
        select_time: "اختر الوقت",

        // Map
        explore_map: "استكشاف الخريطة",
        tap_to_view: "اضغط للرؤية",
        km_away: "كم",
        no_pitches_nearby: "لا توجد ملاعب قريبة",
        no_facilities_10km: "لا توجد ملاعب في نطاق 10 كم من موقعك الحالي.",

        // Facility Types (Supports both your formats)
        type_all: "الكل",
        type_football: "كرة قدم",
        type_basketball: "كرة سلة",
        type_padel: "بادل",
        type_ping_pong: "تنس الطاولة",
        type_playstation: "بلايستيشن",
        football: "كرة قدم",
        basketball: "كرة سلة",
        padel: "بادل",
        "ping pong": "تنس الطاولة",
        playstation: "بلايستيشن",

        // My Facilities Screen
        add_facility: "إضافة ملعب",
        no_facilities_listed: "لا توجد ملاعب مدرجة بعد.",
        tap_add_facility_hint: "اضغط على 'إضافة ملعب' لبدء استقبال الحجوزات.",
        edit_facility: "تعديل الملعب",
        new_facility: "ملعب جديد",
        facility_photo: "صورة الملعب",
        upload_a_photo: "ارفع صورة",
        facility_name: "اسم الملعب",
        facility_name_placeholder: "مثال: ملعب الجزيرة لكرة القدم",
        facility_type: "نوع الملعب",
        location_label: "الموقع",
        pick_on_map: "تحديد على الخريطة",
        location_placeholder: "اضغط على 'تحديد على الخريطة' لتحديد الموقع بدقة",
        description_optional: "الوصف (اختياري)",
        description_placeholder: "مثال: الكرات متوفرة، يوجد موقف سيارات، الدخول من البوابة 3...",
        price_per_hour: "السعر بالساعة (جنيه)",
        price_placeholder: "مثال: 250",
        save_changes: "حفظ التغييرات",
        create_facility: "إنشاء ملعب",
        edit_details: "تعديل التفاصيل",
        delete_facility_title: "حذف الملعب",
        delete_facility_confirm: 'هل أنت متأكد أنك تريد حذف "{name}" نهائياً؟',
        cancel: "إلغاء",
        delete: "حذف",
        delete_account: "حذف الحساب",
        delete_account_confirm: "هل أنت متأكد أنك تريد حذف حسابك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
        account_deleted_success: "تم حذف حسابك نهائياً.",
        missing_info: "معلومات ناقصة",
        fill_required_fields: "يرجى ملء جميع الحقول المطلوبة.",
        missing_location: "الموقع مفقود",
        pick_on_map_hint: 'يرجى الضغط على "تحديد على الخريطة" لتثبيت دبوس لملعبك.',
        invalid_price: "سعر غير صالح",
        invalid_price_message: "يرجى إدخال رقم صالح للسعر.",
        error_generic: "خطأ",
        something_went_wrong: "حدث خطأ ما.",
        network_error: "خطأ في الشبكة",
        check_connection: "يرجى التحقق من اتصالك.",
        permission_denied: "تم رفض الإذن",
        need_location_access: "نحتاج إلى إذن الموقع للعثور عليك.",
        drop_a_pin: "ثبّت الدبوس",
        tap_map_hint: "اضغط في أي مكان على الخريطة لتثبيت دبوس ملعبك.",
        confirm_location: "تأكيد الموقع",

        // Search Screen
        closest_to_me: "الأقرب لي",
        sort_default: "الافتراضي",
        no_match_search: "لا توجد ملاعب مطابقة لبحثك.",
        connection_error_title: "خطأ في الاتصال",
        connection_error_message: "تعذر تحميل الملاعب.",
        location_access_required_title: "مطلوب إذن الموقع",
        location_access_required_message: "يرجى السماح بالوصول للموقع للترتيب حسب المسافة.",
        km_short: "كم",

        // Account Screen
        profile: "الملف الشخصي",
        hello: "مرحباً",
        account_details: "تفاصيل الحساب",
        username: "اسم المستخدم",
        phone_number: "رقم الهاتف",
        password: "كلمة المرور",
        new_password: "كلمة المرور الجديدة",
        confirm_password: "تأكيد كلمة المرور",
        settings: "الإعدادات",
        log_out: "تسجيل الخروج",
        logout_confirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        success: "نجاح",
        details_updated: "تم تحديث تفاصيل حسابك.",
        passwords_not_match: "كلمات المرور غير متطابقة.",
        password_length: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
        error: "خطأ",

        // Bookings
        my_bookings: "حجوزاتي",
        no_bookings_yet: "لم تقم بأي حجز بعد.",
        track_bookings: "تتبع طلباتك وجلساتك",
        date: "التاريخ",
        time: "الوقت",
        cancelled: "ملغى",
        pending: "قيد الانتظار",
        active: "نشط",
        completed: "مكتمل",
        confirmed: "مؤكد",

        // Host Bookings & Dashboard
        my_facilities: "ملاعبي",
        requests: "الطلبات",
        player_label: "اللاعب:",
        total_label: "المجموع:",
        no_requests: "لا توجد طلبات واردة.",
        requests_appear_here: "ستظهر الحجوزات هنا.",
        accept_booking: "قبول الحجز",
        decline_booking: "رفض الحجز",
        confirm_accept: "قبول",
        confirm_decline: "رفض",
        are_you_sure: "هل أنت متأكد أنك تريد",
        booking_for: "هذا الحجز لـ",
        update_failed: "فشل في تحديث حالة الحجز.",
        accept: "قبول",
        decline: "رفض",
        
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const [isLangLoaded, setIsLangLoaded] = useState(false);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLang = await SecureStore.getItemAsync('app_language');
            if (savedLang) {
                setLanguage(savedLang);
                const isRTL = savedLang === 'ar';
                if (I18nManager.isRTL !== isRTL) {
                    I18nManager.allowRTL(isRTL);
                    I18nManager.forceRTL(isRTL);
                }
            }
        } catch (error) {
            console.log("Error loading language", error);
        } finally {
            setIsLangLoaded(true);
        }
    };

    const changeLanguage = async (newLang) => {
        if (newLang === language) return;

        await SecureStore.setItemAsync('app_language', newLang);
        setLanguage(newLang);

        const isRTL = newLang === 'ar';
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);

        setTimeout(async () => {
            try {
                await Updates.reloadAsync();
            } catch (error) {
                console.log('Reload not supported in this environment (e.g. Expo Go). Restart the app manually to apply RTL changes.', error);
            }
        }, 100);
    };

    const t = (key) => {
        return translations[language]?.[key] || key; 
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '';
        const numStr = num.toString();
        if (language === 'ar') {
             return numStr.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
        }
        return numStr;
    };

    if (!isLangLoaded) return null;

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t, formatNumber }}>
            {children}
        </LanguageContext.Provider>
    );
};