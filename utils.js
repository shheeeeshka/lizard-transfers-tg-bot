export const formatAlertMessage = (initMsg = []) => {
    if (!initMsg?.length) return "Ooops...";
    return `${initMsg[0]} -> ${initMsg[1]}\n${initMsg[2]}\nКол-во билетов : ${initMsg[3]}\n${initMsg[4]} ${initMsg[5]} ${initMsg[6]}\nДата рождения : ${initMsg[11]}\n${initMsg[8]} ${initMsg[9]}\n${initMsg[10]}\nМессенджеры : ${initMsg[12]}`;
};

export const formatMergerMessage = () => {
    return `Город отправления : [Донецк]\nГород прибытия : [Санкт-Петербург]\nДата : [30.12.2024]\nКол-во билетов : [1]\nФамилия : [Попов]\nИмя : [Поп]\nОтчество : [Попович]\nБез отчества : [нет]\nТип документа : [Паспорт РФ]\nНомер документа : [6023122829]\nНомер тел. : [+7(900)137-99-29]\nДата рождения : [25-03-2002]\nМессенджеры : [Whats App; Telegram; Viber]\nС питомцем : [нет]`;
};

export const extractBracketContents = (message = "") => {
    const regex = /\[(.*?)\]/g;
    const matches = [];
    let match;

    while ((match = regex.exec(message)) !== null) {
        matches.push(match[1]);
    }

    matches[10] = matches[10].slice(1);
    return matches;
};