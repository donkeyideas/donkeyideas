import { prisma } from '@donkey-ideas/database';
import { hashPassword, verifyPassword, loginSchema } from '@donkey-ideas/auth';
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

export async function loginUser(data: z.infer<typeof loginSchema>) {
  const validated = loginSchema.parse(data);
  const normalizedEmail = validated.email.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (!user) {
    const passwordHash = await hashPassword(validated.password);
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] || 'User',
        passwordHash,
      },
    });
  } else {
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
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
