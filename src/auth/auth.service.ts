import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { Jwt, Msg } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async signUp(dto: AuthDto): Promise<Msg> {
    const hashed = await bcrypt.hash(dto.password, 12);
    try {
      await this.prisma.user.create({
        data: {
          email: dto.email,
          hashedPassword: hashed,
        },
      });
      return {
        message: 'OK',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('このEmailはすでに登録されています。');
        }
      }
      throw error;
    }
  }
  async login(dto: AuthDto): Promise<Jwt> {
    const user = await this.prisma.user.findUnique({
      //既存のuserテーブルに送信されたemailと同じemailがないか検索する
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('Email or password incorrect');
    const isValid = await bcrypt.compare(dto.password, user.hashedPassword); //入力された平文のpassとDBにあるhasedのpassを比較する
    if (!isValid) throw new ForbiddenException('Email or password incorrect');
    return this.generateJwt(user.id, user.email);
  }

  async generateJwt(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '5m',
      secret: secret,
    });
    return {
      accessToken: token,
    };
  }
}
