import axios from "axios";

import { config } from "dotenv";

config();

export const sendNotification = async (phoneNumber = "", messenger = "") => {
    try {
        console.log({ phoneNumber, messenger });
        const { data } = await axios.post(`${process.env.MAILING_SERVICE_URL}/send-notification`, { phoneNumber, messenger });
        console.log("Response : ", data);
    } catch (err) {
        console.error("An error occurred while sending notification : ", err.message);
        throw err;
    }
};