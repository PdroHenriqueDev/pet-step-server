declare namespace Express {
  export interface Request {
    user?: JwtPayload & {id: string; role: string};
  }
}
