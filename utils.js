export const formatAlertMessage = (initMsg = []) => {
    if (!initMsg?.length) return "Ooops...";
    return `${initMsg[0]} -> ${initMsg[1]}\n${initMsg[2]}\nКол-во билетов : ${initMsg[3]}\n${initMsg[4]} ${initMsg[5]} ${initMsg[6]}\nДата рождения : ${initMsg[11]}\n${initMsg[8]} ${initMsg[9]}\n${initMsg[10]}\nМессенджеры : ${initMsg[12]}`;
};

export const formatMergerMessage = () => {
    return `Город отправления : Донецк\nГород прибытия : Санкт-Петербург\nДата : 30.12.2024\nКол-во билетов : 1\nФамилия : Попов\nИмя : Поп\nОтчество : Попович\nБез отчества : нет\nТип документа : Паспорт РФ\nНомер документа : 6023122829\nНомер тел. : +7(900)137-99-29\nДата рождения : 25-03-2002\nМессенджеры : Whats App; Telegram; Viber\nС питомцем : нет`;
};

export const extractBracketContents = (message = "") => {
    const regex = /:\s*(.*?)(?=\n|$)/g;
    const matches = [];
    let match;

    // Создаем массив с пустыми строками для всех ожидаемых полей
    const expectedFields = [
        "Город отправления",
        "Город прибытия",
        "Дата",
        "Кол-во билетов",
        "Фамилия",
        "Имя",
        "Отчество",
        "Без отчества",
        "Тип документа",
        "Номер документа",
        "Номер тел.",
        "Дата рождения",
        "Мессенджеры",
        "С питомцем"
    ];

    for (let i = 0; i < expectedFields.length; i++) {
        matches.push("");
    }

    while ((match = regex.exec(message)) !== null) {
        const index = matches.length - expectedFields.length + matches.filter(m => m !== "").length;
        matches[index] = match[1] ? match[1].trim() : "";
    }

    matches[10] = matches[10].slice(1);

    return matches;
};