import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {ObjectId} from 'mongodb';

dotenv.config();

export function generateAccessToken(userId: ObjectId) {
  return jwt.sign({id: userId}, process.env.JWT_SECRET_ACCESS_TOKEN!, {
    expiresIn: '1h',
  });
}

export function generateRefreshToken(userId: ObjectId) {
  return jwt.sign({id: userId}, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '30d',
  });
}
