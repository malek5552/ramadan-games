// عرض رسالة
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `admin-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// إنشاء جدول جديد
async function initDays() {
    if (!confirm('هل تريد إنشاء جدول جديد؟ سيتم حذف الجدول الحالي.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/init-days', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('تم إنشاء الجدول بنجاح', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage('حدث خطأ', 'error');
        }
    } catch (error) {
        showMessage('حدث خطأ في الاتصال', 'error');
        console.error(error);
    }
}

// تعديل يوم
function editDay(dayNumber) {
    const card = document.getElementById(`day-${dayNumber}`);
    const viewDiv = card.querySelector('.day-view');
    const editDiv = card.querySelector('.edit-form');
    
    viewDiv.style.display = 'none';
    editDiv.style.display = 'flex';
}

// إلغاء التعديل
function cancelEdit(dayNumber) {
    const card = document.getElementById(`day-${dayNumber}`);
    const viewDiv = card.querySelector('.day-view');
    const editDiv = card.querySelector('.edit-form');
    
    viewDiv.style.display = 'flex';
    editDiv.style.display = 'none';
}

// حفظ التعديلات
async function saveDay(dayNumber) {
    const gameName = document.getElementById(`gameName-${dayNumber}`).value;
    const time = document.getElementById(`time-${dayNumber}`).value;
    const host = document.getElementById(`host-${dayNumber}`).value;
    const notes = document.getElementById(`notes-${dayNumber}`).value;
    const isSpecialEvent = document.getElementById(`isSpecialEvent-${dayNumber}`).checked;
    
    try {
        const response = await fetch(`/api/day/update/${dayNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameName,
                time,
                host,
                notes,
                isSpecialEvent
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('تم التحديث بنجاح', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage(data.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        showMessage('حدث خطأ في الاتصال', 'error');
        console.error(error);
    }
}

// حذف يوم
async function deleteDay(dayNumber) {
    if (!confirm('هل تريد حذف هذا اليوم؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/day/delete/${dayNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('تم الحذف بنجاح', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage('حدث خطأ', 'error');
        }
    } catch (error) {
        showMessage('حدث خطأ في الاتصال', 'error');
        console.error(error);
    }
}
