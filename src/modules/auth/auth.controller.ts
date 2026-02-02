
import { Controller, Get, Post, Body, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @ApiOperation({ summary: 'Login with email and password' })
    @UseGuards(LocalAuthGuard)
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @Post('login')
    async login(@Req() req: any, @Res() res: Response) {
        // LocalStrategy returns the user in req.user
        const { accessToken, user } = await this.authService.login(req.user);

        // Set Cookie
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/',
        });

        return res.status(HttpStatus.OK).json({ user });
    }

    @ApiOperation({ summary: 'Logout user' })
    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Logged out successfully.' })
    @Post('logout')
    async logout(@Req() req: any, @Res() res: Response) {
        // JwtAuthGuard ensures req.user is set (from cookie or rotation)
        const userId = req.user.id;
        await this.authService.logout(userId);

        // Clear Cookie
        res.clearCookie('access_token', {
            httpOnly: true,
            path: '/',
        });

        return res.status(HttpStatus.OK).json({ message: 'Logged out successfully' });
    }

    @ApiOperation({ summary: 'Initiate Google OAuth' })
    @Get('google')
    @UseGuards(GoogleOauthGuard)
    async googleAuth(@Req() req) {
        // Guard redirects to Google
    }

    @ApiOperation({ summary: 'Google OAuth Callback' })
    @Get('google/callback')
    @UseGuards(GoogleOauthGuard)
    async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
        const user = await this.authService.validateGoogleUser(req.user);
        const { accessToken } = await this.authService.login(user);

        // Set Cookie
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}?login=success`);
    }

    @ApiOperation({ summary: 'Request password reset' })
    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        // Implement or mock
        // this.authService.forgotPassword(email);
        return { message: 'If email exists, reset code sent' };
    }

    @ApiOperation({ summary: 'Reset password' })
    @Post('reset-password')
    async resetPassword(@Body() body: any) {
        // this.authService.resetPassword(body.code, body.newPassword);
        return { message: 'Password reset successful' };
    }
}
