
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123', description: 'The password of the user (min 6 chars)' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
    @IsString()
    @IsNotEmpty()
    full_name: string;

    @ApiPropertyOptional({ example: 'johndoe', description: 'The username of the user' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'Avatar URL' })
    @IsOptional()
    @IsString()
    avatar_url?: string;
}
