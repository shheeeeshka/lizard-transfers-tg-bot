import TelegramBot from "node-telegram-bot-api";
import express from "express";

import { config } from "dotenv";
import { google } from "googleapis";
import { extractBracketContents, formatAlertMessage, formatMergerMessage } from "./utils.js";
import { sendNotification } from "./notificationService.js";

config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const adminChatId = process.env.ADMIN_CHAT_ID;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.post("/new-request", async (req, res) => {
    try {
        console.log("Siuuuu");
        const { rowIndex, row } = req.body;
        console.log({ rowIndex, row });
        if (!rowIndex || !row) return res.status(400).send({ error: "Missing required field" });
        const message = formatAlertMessage(row);
        const callbackData = JSON.stringify({ action: "accept_user_request", rowIndex });
        await bot.sendMessage(adminChatId, message, {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: "✅ Принять", callback_data: callbackData }],
                    [{ text: "❌ Отклонить", callback_data: JSON.stringify({ action: "decline_user_request" }) }],
                ]
            })
        });

        return res.send("Message sent successfully");
    } catch (err) {
        console.error(err);
    }
});

app.get("/keep-alive", async (req, res) => {
    try {
        return res.send("Alive");
    } catch (err) {
        console.error(err);
    }
});

async function launchBot() {
    try {
        app.listen(PORT, () => console.log(`Server is currently running on port: ${PORT}`));
    } catch (e) {
        console.error(e)
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient().catch((err) => console.error(err.message));

    const googleSheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId1 = process.env.SPREADSHEET_ID_TILDA;

    bot.setMyCommands([
        { command: "/start", description: "Запуск Бота" },
        { command: "/merger", description: "Добавление заявки со стороннего ресурса" },
        { command: "/whoami", description: "Узнать мой chat Id" },
    ]);

    let mergeRequest = false;

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id.toString();
        const messageId = msg.message_id;
        const firstName = msg.chat.first_name;
        const username = msg.chat.username;
        const text = msg.text;
        const telegramId = msg.from.id.toString();
        const isBot = msg.from.is_bot;

        console.log({ chatId });

        if (isBot || chatId !== adminChatId && !text === "/whoami") return;

        if (text?.startsWith("/")) {
            console.log("Starts with /");
            const [command, ...args] = text.split(" ");

            console.log({ command });

            switch (command) {
                case "/whoami":
                    await bot.sendMessage(chatId, `Ваш Chat Id : ${chatId}`);
                    break;
                case "/start":
                    await bot.sendMessage(chatId, "Здравствуйте! Заявки буду присылать при их появлении.").catch((err) => console.error(err.message));
                    break;
                case "/merger":
                    mergeRequest = true;
                    await bot.sendMessage(chatId, `Скиньте мне заявку для добавления в таблицу. Обратите внимание, что все данные необходимо вставлять внутрь квадратных скобок\nЗаявка должна быть вида :`).catch((err) => console.error(err.message));
                    const msgg = formatMergerMessage();
                    await bot.sendMessage(chatId, `${msgg}`).catch((err) => console.error(err.message));
                    break;
                default:
                    return bot.sendMessage(chatId, "Unknown command").catch((err) => console.error(err.message));
            }
        } else {
            if (mergeRequest) {
                const arr = extractBracketContents(text.split());
                console.log(arr);
                googleSheets.spreadsheets.values.append({
                    auth,
                    spreadsheetId: process.env.SPREADSHEET_ID_MAIN,
                    range: "Лист1",
                    valueInputOption: "USER_ENTERED",
                    resource: {
                        values: [arr],
                    },
                })
                    .then(async () => {
                        mergeRequest = false;
                        await bot.sendMessage(chatId, `Запись добавлена в основную таблицу\n\nhttps://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID_MAIN}/edit?gid=0#gid=0`);
                    })
                    .catch((err) => {
                        console.error(err.message);
                        return bot.sendMessage(chatId, `Произошла ошибка при добавлении записи в таблицу\n${err.message}`);
                    });
            }
        }
    });

    bot.on("callback_query", async (query) => {
        const callbackData = JSON.parse(query.data);
        const chatId = query.message.chat.id.toString();
        const messageId = query.message.message_id;
        const currentMessage = query.message.text;

        console.log(typeof chatId, typeof adminChatId);

        if (chatId !== adminChatId) return;
        if (!callbackData?.action) return;

        console.log(callbackData);


        switch (callbackData?.action) {
            case "no_action":
                return;
            case "accept_user_request":
                const rowIndex = callbackData?.rowIndex;
                if (!rowIndex) return;

                console.log("Ok!");

                const { data } = await googleSheets.spreadsheets.values.get({
                    auth,
                    spreadsheetId: spreadsheetId1,
                    range: `Лист1!A:W`,
                });

                const lastRow = data.values[rowIndex];

                console.log(lastRow, "\nlastRow");
                if (!data) {
                    await bot.sendMessage(chatId, `Ошибка при получении данных из таблицы`);
                }

                const preferedMessenger = lastRow[12]?.toLowerCase().includes("whats app") ? "whatsapp" : (lastRow[12].toLowerCase().includes("telegram") ? "telegram" : "");
                const phoneNumber = lastRow[10];

                console.log({ preferedMessenger, phoneNumber });

                if (lastRow[10]) {
                    lastRow[10] = lastRow[10]?.slice(1);
                }

                console.log(lastRow[10]);

                googleSheets.spreadsheets.values.append({
                    auth,
                    spreadsheetId: process.env.SPREADSHEET_ID_MAIN,
                    range: "Лист1",
                    valueInputOption: "USER_ENTERED",
                    resource: {
                        values: [[...lastRow.slice(0, 14), ...lastRow.slice(20, 24)]],
                    },
                }).catch((err) => console.error(err.message));
                console.log(lastRow[10]);

                await bot.editMessageText(currentMessage, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Идет отправка уведомления",
                                    callback_data: JSON.stringify({ action: "no_action" }),
                                }
                            ]
                        ]
                    },
                }).catch((err) => console.error(err.message));

                let finalText = "";

                await bot.sendMessage(chatId, `Заявка добавлена в основную таблицу\nhttps://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID_MAIN}/edit?gid=0#gid=0`).catch((err) => console.error(err.message));
                await bot.editMessageText(currentMessage, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Отправка уведомления...",
                                    callback_data: JSON.stringify({ action: "no_action" }),
                                }
                            ]
                        ]
                    },
                }).catch((err) => console.error(err.message));
                await sendNotification(`${phoneNumber}`, `${preferedMessenger}`)
                    .then(() => finalText = "Заявка одобрена")
                    .catch(err => {
                        finalText = "Ошибка при отправке уведомления";
                        console.error(err.message);
                    })
                    .finally(async () => {
                        await bot.editMessageText(currentMessage, {
                            chat_id: chatId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: finalText,
                                            callback_data: JSON.stringify({ action: "no_action" }),
                                        }
                                    ]
                                ]
                            },
                        }).catch((err) => console.error(err.message));
                    });
                break;
            // case "resend_notification":
            //     await sendNotification();
            //     break;
            case "decline_user_request":
                await bot.editMessageText(currentMessage, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Заявка отклонена",
                                    callback_data: JSON.stringify({ action: "no_action" }),
                                }
                            ]
                        ]
                    },
                }).catch((err) => console.error(err.message));
                break;
            default:
                await bot.sendMessage(adminChatId, `Unknown command`).catch((err) => console.error(err.message));
        }
    });
}

launchBot();