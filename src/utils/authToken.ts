import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {ObjectId} from 'mongodb';

dotenv.config();

export function generateAccessToken(userId: ObjectId, role: string) {
  return jwt.sign({id: userId, role}, process.env.JWT_SECRET_ACCESS_TOKEN!, {
    expiresIn: '1h',
  });
}

export function generateRefreshToken(userId: ObjectId, role: string) {
  return jwt.sign({id: userId, role}, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '30d',
  });
}
