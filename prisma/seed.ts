import { PrismaClient, AuthType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    // 1. Create Roles
    const roles = ['admin', 'user', 'teacher'];

    for (const roleName of roles) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });
        console.log(`Role ensured: ${role.name}`);
    }

    // 2. Create Admin User
    const adminEmail = 'admin@kittens.com';
    const adminPassword = '1234';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {}, // Don't update password if exists to avoid overwrite
        create: {
            email: adminEmail,
            username: 'admin',
            password_hash: hashedPassword,
            full_name: 'System Admin',
            authType: AuthType.local,
            status: 'active',
            description: 'Root Administrator',
        },
    });

    console.log(`Admin user ensured: ${adminUser.email}`);

    // 3. Assign Admin Role to User
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

    if (adminRole) {
        await prisma.userRole.upsert({
            where: {
                user_id_role_id: {
                    user_id: adminUser.id,
                    role_id: adminRole.id,
                },
            },
            update: {},
            create: {
                user_id: adminUser.id,
                role_id: adminRole.id,
            },
        });
        console.log(`Assigned admin role to user ${adminUser.username}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
