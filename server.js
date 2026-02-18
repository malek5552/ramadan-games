const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();

// إعدادات Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// مسارات ملفات البيانات
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const DAYS_FILE = path.join(__dirname, 'data', 'days.json');

// دوال قراءة وكتابة البيانات
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function readDays() {
  try {
    const data = await fs.readFile(DAYS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDays(days) {
  await fs.writeFile(DAYS_FILE, JSON.stringify(days, null, 2));
}

// Middleware للتحقق من تسجيل الدخول
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('ليس لديك صلاحية');
  }
  next();
};

// المسارات - الصفحة الرئيسية
app.get('/', async (req, res) => {
  try {
    const days = await readDays();
    const user = req.session.user || null;
    res.render('index', { days, user });
  } catch (error) {
    res.status(500).send('خطأ في تحميل البيانات');
  }
});

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: 'بيانات الدخول غير صحيحة' });
    }
    
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    res.redirect('/');
  } catch (error) {
    res.render('login', { error: 'حدث خطأ' });
  }
});

// التسجيل
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readUsers();
    
    const exists = users.find(u => u.username === username);
    if (exists) {
      return res.render('login', { error: 'اسم المستخدم موجود' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await writeUsers(users);
    
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role
    };
    
    res.redirect('/');
  } catch (error) {
    res.render('login', { error: 'حدث خطأ في التسجيل' });
  }
});

// تسجيل الخروج
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// لوحة التحكم
app.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = await readDays();
    res.render('admin', { days, user: req.session.user });
  } catch (error) {
    res.status(500).send('خطأ في تحميل البيانات');
  }
});

// API - التصويت
app.post('/api/vote/:dayNumber', requireAuth, async (req, res) => {
  try {
    const { vote } = req.body;
    const days = await readDays();
    const dayIndex = days.findIndex(d => d.dayNumber === parseInt(req.params.dayNumber));
    
    if (dayIndex === -1) {
      return res.json({ success: false, message: 'اليوم غير موجود' });
    }
    
    const day = days[dayIndex];
    const hasVoted = day.votes.some(v => v.user === req.session.user.username);
    if (hasVoted) {
      return res.json({ success: false, message: 'لقد صوّت مسبقاً' });
    }
    
    day.votes.push({ 
      user: req.session.user.username, 
      vote,
      createdAt: new Date().toISOString()
    });
    
    const yesVotes = day.votes.filter(v => v.vote === 'yes').length;
    if (yesVotes >= 3) {
      day.isConfirmed = true;
    }
    
    await writeDays(days);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: 'حدث خطأ' });
  }
});

// API - تحديث يوم
app.post('/api/day/update/:dayNumber', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = await readDays();
    const dayIndex = days.findIndex(d => d.dayNumber === parseInt(req.params.dayNumber));
    
    if (dayIndex === -1) {
      return res.json({ success: false, message: 'اليوم غير موجود' });
    }
    
    days[dayIndex] = {
      ...days[dayIndex],
      ...req.body,
      dayNumber: parseInt(req.params.dayNumber)
    };
    
    await writeDays(days);
    res.json({ success: true, day: days[dayIndex] });
  } catch (error) {
    res.json({ success: false, message: 'حدث خطأ' });
  }
});

// API - حذف يوم
app.post('/api/day/delete/:dayNumber', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = await readDays();
    const filteredDays = days.filter(d => d.dayNumber !== parseInt(req.params.dayNumber));
    await writeDays(filteredDays);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// API - إنشاء جدول جديد
app.post('/api/init-days', requireAuth, requireAdmin, async (req, res) => {
  try {
    const games = ['FIFA', 'Warzone', 'Fortnite', 'Rocket League', 'Valorant', 'Among Us'];
    const hosts = ['أحمد', 'محمد', 'عبدالله', 'خالد', 'سعد'];
    const days = [];
    
    for (let i = 1; i <= 30; i++) {
      days.push({
        dayNumber: i,
        gameName: games[i % games.length],
        time: '11:30 PM',
        host: hosts[i % hosts.length],
        notes: `يوم ${i} من رمضان`,
        isSpecialEvent: i % 10 === 0,
        votes: [],
        isConfirmed: false,
        createdAt: new Date().toISOString()
      });
    }
    
    await writeDays(days);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// بدء السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🌙 موقع جدول ألعاب رمضان');
  console.log('💾 البيانات محفوظة في ملفات JSON محلية');
});
