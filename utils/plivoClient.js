import plivo from 'plivo';
import dotenv from 'dotenv';
dotenv.config();

export const plivoClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);