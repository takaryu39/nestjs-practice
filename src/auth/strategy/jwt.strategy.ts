import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

/* jwtといってもプロジェク_トによって格納する場所やシークレットキーは異なる
それをカスタマイズするファイルがjwt.strategy.ts */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    //カスタマイズしたい内容をsuper内に記載
    super({
      //格納されている場所にあるjwtを取得して返す
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          let jwt = null;
          if (req && req.cookies) {
            jwt = req.cookies['access_token'];
          }
          return jwt;
        },
      ]),
      ignoreExpiration: false, //有効期限が切れていたら無効にする
      secretOrKey: config.get('JWT_SECRET'), //jwtを生成する際に使ったkeyを指定
    });
  }

  //クライアントから受け取ったjwtが正しければ以下の処理が実行されるpayloadは
  async validate(payload: { sub: number; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    delete user.hashedPassword;
    return user;
  }
}
