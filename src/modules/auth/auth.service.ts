
import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { User, AuthType } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && user.password_hash && (await bcrypt.compare(pass, user.password_hash))) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async register(registerDto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        try {
            const user = await this.prisma.user.create({
                data: {
                    email: registerDto.email,
                    password_hash: hashedPassword,
                    full_name: registerDto.full_name,
                    username: registerDto.username,
                    avatar_url: registerDto.avatar_url,
                    authType: AuthType.local,
                },
            });
            const { password_hash, ...result } = user;
            return result;
        } catch (e) {
            if (e.code === 'P2002') {
                throw new BadRequestException('Email or Username already exists');
            }
            throw e;
        }
    }

    async login(user: any) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        // Store in Redis: Whitelist (blacklisted: false)
        await this.redis.set(
            `auth:user:${user.id}`,
            JSON.stringify({ refreshToken, blacklisted: false }),
            'EX',
            7 * 24 * 60 * 60, // 7 days
        );

        return {
            accessToken,
            user,
        };
    }

    async logout(userId: number) {
        const data = await this.redis.get(`auth:user:${userId}`);
        if (data) {
            const parsed = JSON.parse(data);
            parsed.blacklisted = true;
            // Update with same TTL or shorten? Keep same to ensure blacklist persists.
            // Simply overwrite with blacklisted=true.
            await this.redis.set(`auth:user:${userId}`, JSON.stringify(parsed), 'KEEPTTL');
        }
    }

    // Used by Guard to rotate tokens if AT expired
    async rotateTokens(expiredAccessToken: string) {
        let userId: number;
        try {
            // Decode without verifying expiration
            const decoded = this.jwtService.decode(expiredAccessToken) as any;
            if (!decoded || !decoded.sub) return null;
            userId = decoded.sub;
        } catch (e) {
            return null;
        }

        // Check Redis
        const data = await this.redis.get(`auth:user:${userId}`);
        if (!data) return null; // Session expired or invalid

        const { refreshToken, blacklisted } = JSON.parse(data);
        if (blacklisted) return null; // User logged out

        // Verify Refresh Token (ensure it's not expired too, though Redis TTL handles it mostly)
        try {
            await this.jwtService.verify(refreshToken);
        } catch (e) {
            return null;
        }

        // Generate NEW Access Token
        // Should we generate new Refresh Token? User said "rotate access_token".
        // I will keep existing Refresh Token to avoid complex sync unless it's close to expiry?
        // User Instructions: "rotate access_token => check userid from at and blacklist=false"
        // So just new AT.
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        const payload = { sub: user.id, email: user.email };
        const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        return { accessToken: newAccessToken, user };
    }

    async validateGoogleUser(profile: any) {
        const { email, firstName, lastName, picture, googleId } = profile;
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (user) {
            // Update googleId if not linked?
            // Or if authType local, maybe reject?
            // For now, return user.
            return user;
        }

        // Create new google user
        const newUser = await this.prisma.user.create({
            data: {
                email,
                full_name: `${firstName} ${lastName}`,
                avatar_url: picture,
                providerId: googleId,
                authType: AuthType.google,
                description: '',
            },
        });
        return newUser;
    }
}
