
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private authService: AuthService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request?.cookies?.access_token;

        try {
            // Standard check
            const valid = await super.canActivate(context);
            if (valid) return true;
        } catch (err) {
            if (!token) throw err; // If no token, propagate error (401)

            // Try rotation
            const result = await this.authService.rotateTokens(token);
            if (result) {
                const { accessToken, user } = result;
                const response = context.switchToHttp().getResponse();

                // Set New Cookie
                response.cookie('access_token', accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 15 * 60 * 1000,
                    path: '/',
                });

                // Attach user to request
                request.user = user;
                return true;
            }

            // Rotation failed
            throw err;
        }
        return true;
    }
}
