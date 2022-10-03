import {
    Telegraf,
    Markup,
    Scenes,
    session
} from 'telegraf';
import mongoose from "mongoose";
import 'dotenv/config';
import { youtube as _youtube } from '@googleapis/youtube';
import User from './models/users.js';
import Video from './models/videos.js';
import checkFollowingUserVideos from './functions.js';

const bot = new Telegraf(process.env.BOT_TOKEN);


mongoose.connect(process.env.databaseURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.connection.on('connected', () => {
    console.log('[✅ DataBase] Connected!')
});
const englishMenu = Markup.keyboard([
    ['🔎 Check videos', '💨 Follow videos'],
    ['✅ Profile'],
    ['Change language => 🇺🇦']
]).resize()

const ukrainianMenu = Markup.keyboard([
    ['🔎 Перевірити відео', '💨 Слідкувати за відео'],
    ['✅ Профіль'],
    ['Змінити мову => 🇬🇧']
]).resize()
const checkVideos = new Scenes.BaseScene('checkVideos');
const followingVideos =  new Scenes.BaseScene('followingVideos');
const stage = new Scenes.Stage([checkVideos, followingVideos])
stage.hears('🧨 Exit', ctx => {
    ctx.reply(`Hi there ${ctx.message.from.first_name}. YouTube video stats! Check your videos now or follow your videos for a long time!`, englishMenu)
    ctx.scene.leave()
})
stage.hears('🧨 Вихід', ctx => {
    ctx.reply(`Привіт ${ctx.message.from.first_name}. YouTube video stats! Перевіряй свої відео або слідкуй за ними на довгий час!`, ukrainianMenu)
    ctx.scene.leave()
})
bot.use(session(), stage.middleware())
bot.telegram.setMyCommands([{
    command: '/start',
    description: 'Check videos'
},])

checkVideos.enter(ctx => {
    User.findOne({ ID: ctx.from.id }, (err, user) => {
        if (err) console.log(err)
        if (user.language == 'en') {
            ctx.reply('Enter link or links to check', Markup.keyboard([
                ['🧨 Exit']
            ]).resize())
        } else {
            ctx.reply('Введіть посилання, або декілька посилань для перевірки.', Markup.keyboard([
                ['🧨 Вихід']
            ]).resize())
        }
    })
})

checkVideos.on('text', ctx => {
    User.findOne({ ID: ctx.from.id }, (err, user) => {
        if (err) console.log(err)
        if (user.checkCuldown > Date.now()) {
            if (user.language == 'en') {
                ctx.reply('You have to wait 10 minutes to check another videos')
            } else {
                ctx.reply('Ви повинні зачекати 10 хвилин, щоб перевірити інші відео')
            }
            return ctx.scene.leave()
        }
        if (user.language == 'en') {
            if (!ctx.message.text.includes('youtube.com/watch?') && !ctx.message.text.includes('youtu.be/')) return ctx.reply('Enter youtube links to check videos', Markup.keyboard([
                ['🧨 Exit']
            ]).resize())
            ctx.reply('Checking...')
            const youtube = _youtube({
                version: 'v3',
                auth: process.env.YOUTUBE_API_KEY
            })
            if (ctx.message.text.split("\n").length > 20) return ctx.reply('You can check only 20 videos at once')
            ctx.message.text.split('\n').forEach(link => {
                if (link.includes('youtube.com/watch?')) {
                    youtube.videos.list({
                        part: ['snippet', 'statistics'],
                        id: link.split('v=')[1].split("&")[0]
                    }, (err, data) => {
                        if (err) console.log(err)
                        if (data.data.items.length == 0) {
                            ctx.reply(`Video not found by link: ${link}`)
                        } else {
                            ctx.replyWithHTML(`<b>🎭 Title</b>: <b>${data.data.items[0].snippet.title}</b>\n<b>🎫 Link</b>: <b>${link}</b>\n<b>🎩 Channel Name</b>: <b>${data.data.items[0].snippet.channelTitle}</b>\n\n<b>👓 Views</b>: <b>${data.data.items[0].statistics.viewCount}</b>\n<b>❤ Likes</b>: <b>${data.data.items[0].statistics.likeCount}</b>\n<b>💌 Comments</b>: <b>${data.data.items[0].statistics.commentCount}</b>`)
                            Video.create({
                                checkedBy: ctx.from.id,
                                title: data.data.items[0].snippet.title,
                                url: link,
                                videoAlive: true,
                                likes: data.data.items[0].statistics.likeCount,
                                comments: data.data.items[0].statistics.commentCount,
                                views: data.data.items[0].statistics.viewCount,
                                createdAt: Date.now()
                            })
                            user.checkedVideos.push(link)
                        }
                    })
                } else {
                    youtube.videos.list({
                        part: ['snippet', 'statistics'],
                        id: link.split('youtu.be/')[1]?.split("&")[0]
                    }, (err, data) => {
                        if (err) console.log(err)
                        if (data.data.items.length == 0) {
                            ctx.reply(`Video not found by link: ${link}`)
                        } else {
                            ctx.replyWithHTML(`<b>🎭 Title</b>: <b>${data.data.items[0].snippet.title}</b>\n<b>🎫 Link</b>: <b>${link}</b>\n<b>🎩 Channel Name</b>: <b>${data.data.items[0].snippet.channelTitle}</b>\n\n<b>👓 Views</b>: <b>${data.data.items[0].statistics.viewCount}</b>\n<b>❤ Likes</b>: <b>${data.data.items[0].statistics.likeCount}</b>\n<b>💌 Comments</b>: <b>${data.data.items[0].statistics.commentCount}</b>`)
                            Video.create({
                                checkedBy: ctx.from.id,
                                title: data.data.items[0].snippet.title,
                                url: link,
                                videoAlive: true,
                                likes: data.data.items[0].statistics.likeCount,
                                comments: data.data.items[0].statistics.commentCount,
                                views: data.data.items[0].statistics.viewCount,
                                createdAt: Date.now()
                            })
                            user.checkedVideos.push(link)
                        }
                    })
                }
            })
            user.checkCuldown = Date.now() + 600000;
            user.save()
            ctx.reply('Working....', englishMenu)
            ctx.scene.leave()
        } else {
            if (!ctx.message.text.includes('youtube.com/watch?') && !ctx.message.text.includes('youtu.be/')) return ctx.reply('Введіть посилання на YouTube відео для перевірки', Markup.keyboard([
                ['🧨 Вихід']
            ]).resize())
            ctx.reply('Перевірка...')
            const youtube = _youtube({
                version: 'v3',
                auth: process.env.YOUTUBE_API_KEY
            })
            if (ctx.message.text.split("\n").length > 20) return ctx.reply('Ви можете перевірити лише 20 відео одночасно')
            ctx.message.text.split('\n').forEach(link => {
                if (link.includes('youtube.com/watch?')) {
                    youtube.videos.list({
                        part: ['snippet', 'statistics'],
                        id: link.split('v=')[1].split("&")[0]
                    }, (err, data) => {
                        if (err) console.log(err)
                        if (data.data.items.length == 0) {
                            ctx.reply(`Відео не знайдено за посиланням: ${link}`)
                        } else {
                            ctx.replyWithHTML(`<b>🎭 Назва</b>: <b>${data.data.items[0].snippet.title}</b>\n<b>🎫 Посилання</b>: <b>${link}</b>\n<b>🎩 Назва каналу</b>: <b>${data.data.items[0].snippet.channelTitle}</b>\n\n<b>👓 Переглядів</b>: <b>${data.data.items[0].statistics.viewCount}</b>\n<b>❤ Лайків</b>: <b>${data.data.items[0].statistics.likeCount}</b>\n<b>💌 Коментарів</b>: <b>${data.data.items[0].statistics.commentCount}</b>`)
                            Video.create({
                                checkedBy: ctx.from.id,
                                title: data.data.items[0].snippet.title,
                                url: link,
                                videoAlive: true,
                                likes: data.data.items[0].statistics.likeCount,
                                comments: data.data.items[0].statistics.commentCount,
                                views: data.data.items[0].statistics.viewCount,
                                createdAt: Date.now()
                            })
                            user.checkedVideos.push(link)
                        }
                    })
                } else {
                    youtube.videos.list({
                        part: ['snippet', 'statistics'],
                        id: link.split('youtu.be/')[1]?.split("&")[0]
                    }, (err, data) => {
                        if (err) console.log(err)
                        if (data.data.items.length == 0) {
                            ctx.reply(`Відео не знайдено за посиланням: ${link}`)
                        } else {
                            ctx.replyWithHTML(`<b>🎭 Назва</b>: <b>${data.data.items[0].snippet.title}</b>\n<b>🎫 Посилання</b>: <b>${link}</b>\n<b>🎩 Назва каналу</b>: <b>${data.data.items[0].snippet.channelTitle}</b>\n\n<b>👓 Переглядів</b>: <b>${data.data.items[0].statistics.viewCount}</b>\n<b>❤ Лайків</b>: <b>${data.data.items[0].statistics.likeCount}</b>\n<b>💌 Коментарів</b>: <b>${data.data.items[0].statistics.commentCount}</b>`)
                            Video.create({
                                checkedBy: ctx.from.id,
                                title: data.data.items[0].snippet.title,
                                url: link,
                                videoAlive: true,
                                likes: data.data.items[0].statistics.likeCount,
                                comments: data.data.items[0].statistics.commentCount,
                                views: data.data.items[0].statistics.viewCount,
                                createdAt: Date.now()
                            })
                            user.checkedVideos.push(link)
                        }
                    })
                }

            })
            user.checkCuldown = Date.now() + 600000;
            user.save()
            ctx.reply('Працюю...', ukrainianMenu)
            ctx.scene.leave()
        }
    })
})

followingVideos.enter(async ctx => {
    User.findOne({ID: ctx.from.id}, async (err, user) => {
        if(err) console.log(err)
        if(user.language == 'en') {
            ctx.reply('Enter the list of links to the videos you want to follow, you can add up to 20 videos at a time')
        } else {
            ctx.reply('Введіть список посилань на відео, за якими ви хочете слідкувати, ви можете додати до 20 відео одночасно')
        }
    })
})

followingVideos.on('text', async ctx => {
    User.findOne({ID: ctx.from.id}, async (err, user) => {
        if(err) console.log(err)
        if(user.language == 'en') {
            if(!ctx.message.text.includes('youtu')) return ctx.scene.leave()
            if(user.followingVideos.length > 20) {
                ctx.reply('You can add up to 20 videos! Not More!')
                return ctx.scene.leave()
            }
            if(20 - user.followingVideos.length < ctx.message.text.split('\n').length) {
                ctx.reply(`You can add up to 20 videos! You can add ${20 - user.followingVideos.length}!`)
                return ctx.scene.leave()
            }
            ctx.message.text.split('\n').forEach(link => {
                if(link.includes('youtube.com/watch?')) {
                    user.followingVideos.push(link.split('v=')[1]?.split("&")[0])
                } else if (link.includes('youtu.be/')) {
                    user.followingVideos.push(link.split('youtu.be/')[1]?.split("&")[0])
                } else {
                    return
                }
            })
            user.save()
            ctx.reply(`Done! Added ${ctx.message.text.split('\n').length} videos to follow!`, englishMenu)
            ctx.scene.leave()
        } else {
            if(!ctx.message.text.includes('youtu')) return ctx.scene.leave()
            if(user.followingVideos.length > 20) {
                ctx.reply('Ви можете додати до 20 відео! Не Більше!')
                return tx.scene.leave()
            }
            if(20 - user.followingVideos.length < ctx.message.text.split('\n').length) {
                ctx.reply(`Ви можете додати до 20 відео! Ви ще можете додати ${20 - user.followingVideos.length}!`)
                return ctx.scene.leave()
            }
            ctx.message.text.split('\n').forEach(link => {
                if(link.includes('youtube.com/watch?')) {
                    user.followingVideos.push(link.split('v=')[1]?.split("&")[0])
                } else if (link.includes('youtu.be/')) {
                    user.followingVideos.push(link.split('youtu.be/')[1]?.split("&")[0])
                } else {
                    return
                }
            })
            user.save()
            ctx.reply(`Готово! Додано ${ctx.message.text.split('\n').length} відео для слідкування!`, ukrainianMenu)
            ctx.scene.leave()
        }
    })
})

bot.start(async (ctx) => {
    User.findOne({
        ID: ctx.from.id
    }, (err, user) => {
        if (err) return console.log(err);
        if (!user) {
            const newUser = new User({
                ID: ctx.from.id,
                username: ctx.from.username,
                firstName: ctx.from.first_name,
                lastName: ctx.from.last_name,
                followingVideos: [],
                checkedVideos: [],
                isAdmin: false,
                language: "en"
            });
            newUser.save().then(() => {
                ctx.reply(`Hi there ${ctx.message.from.first_name}. YouTube video stats! Check your videos now or follow your videos for a long time!`, englishMenu);
            });
        } else {
            if (user.language == "en") {
                ctx.reply(`Hi there ${ctx.message.from.first_name}. YouTube video stats! Check your videos now or follow your videos for a long time! Developed by @NodeJsD`, englishMenu)
            } else {
                ctx.reply(`Привіт ${ctx.message.from.first_name}. YouTube video stats! Перевір свої відео зараз або слідкуй за ними на довгий час! Розробка - @NodeJsD`, ukrainianMenu)
            }
        }
    })
})

bot.on('text', async (ctx) => {
    if (ctx.message.text === '🔎 Check videos' || ctx.message.text === '🔎 Перевірити відео') {
        return ctx.scene.enter('checkVideos')
    }
    if (ctx.message.text === 'Change language => 🇺🇦' || ctx.message.text === 'Змінити мову => 🇬🇧') {
        User.findOne({ ID: ctx.from.id }, (err, user) => {
            if (err) console.log(err)
            if (user.language === 'en') {
                user.language = 'ua'
                user.save()
                ctx.reply('Мову змінено на Українську!', ukrainianMenu)
            } else {
                user.language = 'en'
                user.save()
                ctx.reply('Language changed to English!', englishMenu)
            }
        })
    }
    if(ctx.message.text === '💨 Follow videos' || ctx.message.text === '💨 Слідкувати за відео') {
        return ctx.scene.enter('followingVideos')
    }
    if(ctx.message.text === '✅ Профіль' || ctx.message.text === '✅ Profile') {
        User.findOne({ ID: ctx.from.id }, (err, user) => {
            if (err) console.log(err)
            if (user.language === 'en') {
                ctx.replyWithHTML(`<b>📝 Username</b>: <b>@${user.username}</b>\n<b>📝 First name</b>: <b>${user.firstName}</b>\n<b>📝 Last name</b>: <b>${user.lastName}</b>\n<b>📝 ID</b>: <b>${user.ID}</b>\n<b>📝 Checked Videos: ${user.checkedVideos.length}</b>\n<b>📝 Following Count: ${user.followingVideos.length} (${20-user.followingVideos.length} places left) </b>\n<b>📝 Language</b>: <b>${user.language}</b>`, Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🔎 Check Following Videos', 'checkFollowingVideos'),
                        Markup.button.callback('❌ Clear Following', 'clearFollowing')
                    ]
                ]))
            } else {
                ctx.replyWithHTML(`<b>📝 Ім'я користувача</b>: <b>@${user.username}</b>\n<b>📝 Ім'я</b>: <b>${user.firstName}</b>\n<b>📝 Прізвище</b>: <b>${user.lastName}</b>\n<b>📝 ID</b>: <b>${user.ID}</b>\n<b>📝 Перевірено відео: ${user.checkedVideos.length}</b>\n<b>📝 Слідкуєте за відео: ${user.followingVideos.length} (${20-user.followingVideos.length} місця залишилося)</b>\n<b>📝 Мова</b>: <b>${user.language}</b>`, Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🔎 Перевірити слідкування', 'checkFollowingVideos'),
                        Markup.button.callback('❌ Очистити слідкування', 'clearFollowing')
                    ]
                ]))
            }
        })
    }
})

bot.action('checkFollowingVideos', async (ctx) => {
    ctx.answerCbQuery()
    checkFollowingUserVideos(ctx)
})
bot.action('clearFollowing', async (ctx) => {
    ctx.answerCbQuery()
    User.findOne({ ID: ctx.from.id }, (err, user) => {
        if (err) console.log(err)
        user.followingVideos = []
        user.save()
        if (user.language === 'en') {
            ctx.reply('Following videos cleared!', englishMenu)
        } else {
            ctx.reply('Слідкування за відео очищено!', ukrainianMenu)
        }
    })
})
bot.launch().then(() => {
    console.log('[✅ BOT] Connected!')
    User.count({}, (err, count) => {
        if (err) console.log(err)
        console.log(`[📦 Пользователи] ${count}`)
    })

}).catch(err => {
    console.log(err)
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));