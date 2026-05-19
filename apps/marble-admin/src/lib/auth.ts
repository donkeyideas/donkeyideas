import { prisma } from '@donkey-ideas/database';
import { verifyPassword, loginSchema } from '@donkey-ideas/auth';
import { randomUUID } from 'crypto';
import { z } from 'zod';

export async function getUserByToken(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) return null;

  return session.user;
}

// TODO: replace this hardcoded allowlist with a proper `role` column on User.
const ADMIN_EMAIL_ALLOWLIST = ['info@donkeyideas.com'];

export async function loginUser(data: z.infer<typeof loginSchema>) {
  const validated = loginSchema.parse(data);
  const normalizedEmail = validated.email.toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(validated.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function requireAdmin(token: string) {
  const user = await getUserByToken(token);
  if (!user) return null;
  // TODO: add a proper `role` column to User and check user.role === 'admin'.
  if (!ADMIN_EMAIL_ALLOWLIST.includes(user.email.toLowerCase())) {
    return null;
  }
  return user;
}
