import User from './models/users.js';
import { youtube as _youtube } from '@googleapis/youtube';
import {
    Markup
} from 'telegraf';
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
export default function checkFollowingUserVideos(ctx) {
    User.findOne({ID: ctx.from.id}, (err, user) => {
        if(err) console.log(err)
        if(user.language == "en") {
            if(user.followingVideos == 0) {
                ctx.reply("You don't follow any videos")
            } else {
                const validVideos = [];
                Promise.all(
                    user.followingVideos.map(async vid => {
                        const youtube = _youtube({
                            version: 'v3',
                            auth: process.env.YOUTUBE_API_KEY
                        });
                        await youtube.videos.list({
                            part: ['snippet', 'statistics'],
                            id: vid
                        }).then((response) => {
                            if(response.data.items.length == 0) {
                               return ctx.reply(`Video: https://www.youtube.com/watch?v=${vid} not found`)
                            }
                            const video = response.data.items[0]
                            const title = video.snippet.title
                            const channel = video.snippet.channelTitle
                            const views = video.statistics.viewCount
                            const likes = video.statistics.likeCount
                            const comments = video.statistics.commentCount
                            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`
                            ctx.replyWithHTML(`<b>${title}</b>
<b>Channel:</b> ${channel}
<b>Video URL:</b> ${videoUrl}\n
<b>Views:</b> ${views}
<b>Likes:</b> ${likes}
<b>Comments:</b> ${comments}`)
                            validVideos.push(vid)
                        })
                    }),
                    (function after() {
                        console.log(validVideos)
                        user.checkCuldown = Date.now() + 600000;
                        user.save()
                        ctx.reply('Check ends.... You can check your following videos again in 10 minute', englishMenu)
                    })()
                )
                console.log(validVideos)
            }
        } else {
            if(user.followingVideos == 0) {
                ctx.reply("Вы не слідкуєте за відео")
            } else {
                const validVideos = [];
                Promise.all(
                    user.followingVideos.map(async vid => {
                        const youtube = _youtube({
                            version: 'v3',
                            auth: process.env.YOUTUBE_API_KEY
                        });
                        await youtube.videos.list({
                            part: ['snippet', 'statistics'],
                            id: vid
                        }).then((response) => {
                            if(response.data.items.length == 0) {
                                return ctx.reply(`Відео: https://www.youtube.com/watch?v=${vid} не знайдено`)
                            }
                            const video = response.data.items[0]
                            const title = video.snippet.title
                            const channel = video.snippet.channelTitle
                            const views = video.statistics.viewCount
                            const likes = video.statistics.likeCount
                            const comments = video.statistics.commentCount
                            const videoUrl = `https://www.youtube.com/watch?v=${video.id}`
                            ctx.replyWithHTML(`<b>${title}</b>
<b>Канал:</b> ${channel}
<b>Посилання на відео:</b> ${videoUrl}\n
<b>Переглядів:</b> ${views}
<b>Лайків:</b> ${likes}
<b>Коментарів:</b> ${comments}`)
                            validVideos.push(vid)
                        })
                    }),
                    (function after() {
                        user.checkCuldown = Date.now() + 600000;
                        user.save()
                        ctx.reply('Перевірку завершено! Ви можете перевірити відео ще раз через 10 хвилин! ', ukrainianMenu)
                    })()
                )
            }
        }
    })
}