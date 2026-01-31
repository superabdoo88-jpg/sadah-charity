// ===============================================
// نظام إدارة الطلبات المحسّن
// ===============================================

// ⚠️ مهم: استبدل هذا الرابط بالرابط الخاص بك
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqs_uG2C1iD6ZFJfCs1jp_LTsfpKBffUjmdgchOS_l3o4OJmAsWb8BinKsEskoaLXS/exec';

// إعدادات النظام
const CONFIG = {
    autoSaveInterval: 30000, // حفظ تلقائي كل 30 ثانية
    deviceIdKey: 'sadah_device_id',
    tempDataKey: 'sadah_temp_data',
    requestsKey: 'sadah_my_requests',
    lastSaveKey: 'sadah_last_save',
};

// معرّف الجهاز الفريد
let deviceId = null;
let autoSaveTimer = null;
let isOnline = navigator.onLine;

// ===============================================
// التهيئة عند تحميل الصفحة
// ===============================================
window.addEventListener('load', function() {
    initializeApp();
});

function initializeApp() {
    // إنشاء أو استرجاع معرّف الجهاز
    deviceId = getOrCreateDeviceId();
    document.getElementById('deviceId').value = deviceId;
    
    // عرض التاريخ
    displayCurrentDate();
    
    // استرجاع البيانات المحفوظة
    loadSavedData();
    
    // تحديث عداد الطلبات
    updateRequestCount();
    
    // تفعيل الحفظ التلقائي
    startAutoSave();
    
    // مراقبة حالة الإنترنت
    setupNetworkMonitoring();
    
    // معالجة إرسال النموذج
    setupFormSubmission();
    
    // التحقق من وجود معامل تعديل في الرابط
    checkForEditMode();
}

// ===============================================
// إدارة معرّف الجهاز
// ===============================================
function getOrCreateDeviceId() {
    let id = localStorage.getItem(CONFIG.deviceIdKey);
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(CONFIG.deviceIdKey, id);
    }
    return id;
}

// ===============================================
// عرض التاريخ الحالي
// ===============================================
function displayCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const dateStr = now.toLocaleDateString('ar-SA', options);
    document.getElementById('currentDate').textContent = dateStr;
}

// ===============================================
// الحفظ التلقائي
// ===============================================
function startAutoSave() {
    // حفظ عند أي تغيير في الحقول
    const form = document.getElementById('applicationForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            debouncedAutoSave();
        });
    });
    
    // حفظ دوري كل 30 ثانية
    autoSaveTimer = setInterval(() => {
        autoSaveFormData();
    }, CONFIG.autoSaveInterval);
}

// تأخير الحفظ لتجنب الحفظ المتكرر
let saveTimeout = null;
function debouncedAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        autoSaveFormData();
    }, 2000); // انتظر ثانيتين بعد آخر تغيير
}

function autoSaveFormData() {
    const formData = collectFormData();
    
    // حفظ في localStorage
    localStorage.setItem(CONFIG.tempDataKey, JSON.stringify(formData));
    localStorage.setItem(CONFIG.lastSaveKey, new Date().toISOString());
    
    // إظهار مؤشر الحفظ
    showAutosaveIndicator();
}

function manualSave() {
    autoSaveFormData();
    alert('✓ تم حفظ البيانات مؤقتاً!\n\nستبقى بياناتك محفوظة حتى مع انقطاع الإنترنت.');
}

function showAutosaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// ===============================================
// جمع بيانات النموذج
// ===============================================
function collectFormData() {
    const form = document.getElementById('applicationForm');
    const data = {};
    
    // جمع جميع الحقول النصية
    const textInputs = form.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], select');
    textInputs.forEach(input => {
        if (input.name) {
            data[input.name] = input.value;
        }
    });
    
    return data;
}

// ===============================================
// استرجاع البيانات المحفوظة
// ===============================================
function loadSavedData() {
    const savedData = localStorage.getItem(CONFIG.tempDataKey);
    const lastSave = localStorage.getItem(CONFIG.lastSaveKey);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        const form = document.getElementById('applicationForm');
        
        // استرجاع القيم
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input && data[key]) {
                input.value = data[key];
            }
        });
        
        // إظهار رسالة
        if (lastSave) {
            const saveDate = new Date(lastSave);
            const timeAgo = getTimeAgo(saveDate);
            console.log(`✓ تم استرجاع البيانات المحفوظة (آخر حفظ: ${timeAgo})`);
        }
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'منذ لحظات';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

// ===============================================
// مراقبة حالة الشبكة
// ===============================================
function setupNetworkMonitoring() {
    updateNetworkStatus();
    
    window.addEventListener('online', () => {
        isOnline = true;
        updateNetworkStatus();
        
        // محاولة إرسال البيانات المحفوظة
        const tempData = localStorage.getItem(CONFIG.tempDataKey);
        if (tempData) {
            console.log('✓ الاتصال عاد! يمكنك الآن إرسال الطلب.');
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateNetworkStatus();
        console.log('⚠ انقطع الاتصال بالإنترنت. سيتم حفظ بياناتك محلياً.');
    });
}

function updateNetworkStatus() {
    const statusElement = document.getElementById('networkStatus');
    const textElement = document.getElementById('networkText');
    
    if (isOnline) {
        statusElement.className = 'network-status online';
        textElement.textContent = 'متصل';
    } else {
        statusElement.className = 'network-status offline';
        textElement.textContent = 'غير متصل';
    }
}

// ===============================================
// معالجة إرسال النموذج
// ===============================================
function setupFormSubmission() {
    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const successMsg = document.getElementById('successMessage');
        const errorMsg = document.getElementById('errorMessage');
        
        // التحقق من الاتصال
        if (!isOnline) {
            alert('⚠️ لا يوجد اتصال بالإنترنت!\n\nسيتم حفظ بياناتك محلياً. يمكنك إرسال الطلب عند عودة الاتصال.');
            autoSaveFormData();
            return;
        }
        
        // التحقق من إعداد رابط Google Script
        if (GOOGLE_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            alert('⚠️ يرجى إعداد رابط Google Apps Script أولاً!');
            return;
        }
        
        // إخفاء الرسائل السابقة
        successMsg.style.display = 'none';
        errorMsg.style.display = 'none';
        
        // إظهار التحميل
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitText.textContent = 'جاري الإرسال...';

        try {
            // جمع بيانات النموذج
            const formData = new FormData(this);
            
            // تحويل البيانات إلى كائن
            const data = collectFormData();
            
            // إضافة معلومات إضافية
            data.submissionDate = new Date().toLocaleString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            data.deviceId = deviceId;
            
            // التحقق من وضع التعديل
            const editMode = document.getElementById('editMode').value === 'true';
            const requestId = document.getElementById('requestId').value;
            
            if (editMode && requestId) {
                data.requestId = requestId;
                data.isEdit = true;
            }
            
            // معالجة الملفات
            const files = {};
            for (let [key, value] of formData.entries()) {
                if (value instanceof File && value.size > 0) {
                    files[key] = await fileToBase64(value);
                }
            }
            
            // إرسال البيانات
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: data,
                    files: files,
                    timestamp: new Date().getTime()
                })
            });
            
            // حفظ الطلب محلياً
            saveRequestLocally(data);
            
            // إظهار رسالة النجاح
            successMsg.style.display = 'block';
            successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // مسح البيانات المحفوظة مؤقتاً
            localStorage.removeItem(CONFIG.tempDataKey);
            localStorage.removeItem(CONFIG.lastSaveKey);
            
            // تحديث عداد الطلبات
            updateRequestCount();
            
            // إعادة تعيين النموذج
            setTimeout(() => {
                this.reset();
                document.querySelectorAll('.file-preview').forEach(preview => {
                    preview.style.display = 'none';
                });
                successMsg.style.display = 'none';
                
                // إخفاء بانر التعديل إذا كان ظاهراً
                document.getElementById('editModeBanner').classList.remove('show');
                document.getElementById('editMode').value = 'false';
                document.getElementById('requestId').value = '';
                submitText.textContent = 'إرسال الطلب';
            }, 5000);
            
        } catch (error) {
            console.error('خطأ في الإرسال:', error);
            errorMsg.style.display = 'block';
            errorMsg.textContent = '✗ حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.';
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            if (!editMode) {
                submitText.textContent = 'إرسال الطلب';
            } else {
                submitText.textContent = 'تحديث الطلب';
            }
        }
    });
}

// ===============================================
// تحويل الملف إلى base64
// ===============================================
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===============================================
// حفظ الطلب محلياً
// ===============================================
function saveRequestLocally(data) {
    let requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    // إنشاء معرّف فريد للطلب
    const requestId = data.requestId || 'req_' + Date.now();
    
    // التحقق من وجود الطلب (تحديث)
    const existingIndex = requests.findIndex(r => r.requestId === requestId);
    
    const requestData = {
        requestId: requestId,
        name: data.name,
        civilId: data.civilId,
        phone: data.phone,
        submissionDate: data.submissionDate,
        status: 'pending', // pending, approved
        approved: false,
        approvedDate: null,
        deviceId: deviceId,
        lastModified: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        requests[existingIndex] = requestData;
    } else {
        requests.push(requestData);
    }
    
    localStorage.setItem(CONFIG.requestsKey, JSON.stringify(requests));
}

// ===============================================
// عرض الطلبات المرسلة
// ===============================================
function toggleMyRequests() {
    const section = document.getElementById('myRequestsSection');
    section.classList.toggle('show');
    
    if (section.classList.contains('show')) {
        displayMyRequests();
    }
}

function displayMyRequests() {
    const requestsList = document.getElementById('requestsList');
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <p style="font-size: 1.2em;">📋</p>
                <p>لا توجد طلبات مرسلة بعد</p>
            </div>
        `;
        return;
    }
    
    // ترتيب الطلبات من الأحدث للأقدم
    requests.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    requestsList.innerHTML = requests.map(request => `
        <div class="request-card">
            <div class="request-status ${request.approved ? 'status-approved' : (canEdit(request) ? 'status-editable' : 'status-pending')}">
                ${request.approved ? '✓ معتمد' : (canEdit(request) ? '🔧 قابل للتعديل' : '⏳ قيد المراجعة')}
            </div>
            
            <div class="request-info">
                <strong>الاسم:</strong> ${request.name}
            </div>
            <div class="request-info">
                <strong>الرقم المدني:</strong> ${request.civilId}
            </div>
            <div class="request-info">
                <strong>رقم الهاتف:</strong> ${request.phone}
            </div>
            <div class="request-info">
                <strong>تاريخ الإرسال:</strong> ${request.submissionDate}
            </div>
            ${request.approvedDate ? `
            <div class="request-info">
                <strong>تاريخ الاعتماد:</strong> ${request.approvedDate}
            </div>
            ` : ''}
            
            <div class="request-actions">
                <button class="btn-edit" onclick="editRequest('${request.requestId}')" ${!canEdit(request) ? 'disabled' : ''}>
                    ${canEdit(request) ? '✏️ تعديل الطلب' : '🔒 تم الاعتماد'}
                </button>
                <button class="btn-view" onclick="viewRequest('${request.requestId}')">
                    👁️ عرض التفاصيل
                </button>
            </div>
        </div>
    `).join('');
}

function updateRequestCount() {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    document.getElementById('requestCount').textContent = requests.length;
}

// ===============================================
// التحقق من إمكانية التعديل
// ===============================================
function canEdit(request) {
    // لا يمكن التعديل إذا تم الاعتماد
    return !request.approved;
}

// ===============================================
// تعديل طلب
// ===============================================
function editRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (!request) {
        alert('❌ لم يتم العثور على الطلب!');
        return;
    }
    
    if (!canEdit(request)) {
        alert('🔒 لا يمكن تعديل هذا الطلب لأنه تم اعتماده من قبل الفريق.');
        return;
    }
    
    // تفعيل وضع التعديل
    document.getElementById('editMode').value = 'true';
    document.getElementById('requestId').value = requestId;
    
    // إظهار بانر التعديل
    const banner = document.getElementById('editModeBanner');
    document.getElementById('editRequestNumber').textContent = requestId;
    banner.classList.add('show');
    
    // تغيير نص زر الإرسال
    document.getElementById('submitText').textContent = 'تحديث الطلب';
    
    // ملء النموذج بالبيانات
    // (سيتم ملؤه من localStorage أو من API)
    
    // إغلاق قسم الطلبات
    document.getElementById('myRequestsSection').classList.remove('show');
    
    // التمرير للنموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    alert('✏️ يمكنك الآن تعديل الطلب وإرساله مرة أخرى.\n\nملاحظة: لن تتمكن من التعديل بعد أن يفتح أحد أعضاء الفريق الإيميل.');
}

// ===============================================
// عرض تفاصيل طلب
// ===============================================
function viewRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (!request) {
        alert('❌ لم يتم العثور على الطلب!');
        return;
    }
    
    const details = `
📋 تفاصيل الطلب

رقم الطلب: ${requestId}
الاسم: ${request.name}
الرقم المدني: ${request.civilId}
رقم الهاتف: ${request.phone}
تاريخ الإرسال: ${request.submissionDate}
الحالة: ${request.approved ? 'معتمد ✓' : 'قيد المراجعة ⏳'}
${request.approvedDate ? `تاريخ الاعتماد: ${request.approvedDate}` : ''}

${!request.approved ? '\n💡 يمكنك تعديل هذا الطلب طالما لم يتم اعتماده.' : ''}
    `;
    
    alert(details);
}

// ===============================================
// التحقق من وضع التعديل في الرابط
// ===============================================
function checkForEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        editRequest(editId);
    }
}

// ===============================================
// معاينة الملف المرفوع
// ===============================================
function showFilePreview(input) {
    const preview = input.nextElementSibling;
    if (input.files.length > 0) {
        const fileNames = Array.from(input.files).map(f => f.name).join(', ');
        preview.textContent = `✓ تم اختيار: ${fileNames}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

// ===============================================
// إعادة تعيين النموذج
// ===============================================
function resetForm() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
        document.getElementById('applicationForm').reset();
        localStorage.removeItem(CONFIG.tempDataKey);
        localStorage.removeItem(CONFIG.lastSaveKey);
        
        document.querySelectorAll('.file-preview').forEach(preview => {
            preview.style.display = 'none';
        });
        
        // إخفاء وضع التعديل
        document.getElementById('editModeBanner').classList.remove('show');
        document.getElementById('editMode').value = 'false';
        document.getElementById('requestId').value = '';
        document.getElementById('submitText').textContent = 'إرسال الطلب';
    }
}

// ===============================================
// تحذير قبل إغلاق الصفحة
// ===============================================
window.addEventListener('beforeunload', function(e) {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    let hasData = false;
    
    for (let [key, value] of formData.entries()) {
        if (value && value !== '') {
            hasData = true;
            break;
        }
    }
    
    if (hasData) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ===============================================
// دالة محاكاة لاعتماد الطلب (للاختبار فقط)
// ===============================================
function simulateApproval(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (request) {
        request.approved = true;
        request.status = 'approved';
        request.approvedDate = new Date().toLocaleString('ar-SA');
        localStorage.setItem(CONFIG.requestsKey, JSON.stringify(requests));
        
        alert('✓ تم اعتماد الطلب!\n\nلن يكون بالإمكان تعديله بعد الآن.');
        displayMyRequests();
    }
}

// ===============================================
// تصدير الدوال للاستخدام العام
// ===============================================
window.toggleMyRequests = toggleMyRequests;
window.editRequest = editRequest;
window.viewRequest = viewRequest;
window.manualSave = manualSave;
window.resetForm = resetForm;
window.showFilePreview = showFilePreview;
window.simulateApproval = simulateApproval;