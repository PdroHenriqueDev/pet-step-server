import {Request, Response, NextFunction} from 'express';
import jwt, {JwtPayload} from 'jsonwebtoken';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({data: 'Token não fornecido'});
  }

  jwt.verify(token, process.env.JWT_SECRET_ACCESS_TOKEN!, (err, decoded) => {
    if (err) {
      return res.status(401).json({data: 'Token inválido ou expirado'});
    }

    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
      req.user = decoded as JwtPayload & {id: string};
      return next();
    }

    return res.status(401).json({data: 'Token inválido'});
  });
}
