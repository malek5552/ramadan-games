// العداد التنازلي
function updateCountdown() {
    const now = new Date();
    
    // توقيت الرياض (UTC+3)
    const riyadhOffset = 3 * 60; // بالدقائق
    const localOffset = now.getTimezoneOffset(); // فرق التوقيت المحلي عن UTC
    const riyadhTime = new Date(now.getTime() + (riyadhOffset + localOffset) * 60000);
    
    const gameTime = new Date(riyadhTime);
    gameTime.setHours(23, 30, 0, 0); // 11:30 PM
    
    if (gameTime < riyadhTime) {
        gameTime.setDate(gameTime.getDate() + 1);
    }
    
    const difference = gameTime - riyadhTime;
    
    if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }
}

// تحديث العداد كل ثانية
if (document.getElementById('countdown')) {
    setInterval(updateCountdown, 1000);
    updateCountdown();
}

// التصويت
async function vote(dayNumber, voteType) {
    try {
        const response = await fetch(`/api/vote/${dayNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vote: voteType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('تم التصويت بنجاح!');
            location.reload();
        } else {
            alert(data.message || 'حدث خطأ');
        }
    } catch (error) {
        alert('حدث خطأ في التصويت');
        console.error(error);
    }
}
