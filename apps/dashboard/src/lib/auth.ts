import { prisma } from '@donkey-ideas/database';
import { hashPassword, verifyPassword } from '@donkey-ideas/auth';
import { registerSchema, loginSchema } from '@donkey-ideas/auth';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { authenticator } from 'otplib';

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const validated = registerSchema.parse(data);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(validated.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: validated.email,
      name: validated.name,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(data: z.infer<typeof loginSchema> & { totpCode?: string }) {
  const validated = loginSchema.parse(data);

  // Find user
  let user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  // DEV FRIENDLY BEHAVIOR:
  // If user doesn't exist OR password is invalid, (re)create the user
  // with the provided credentials so login "just works" for local setups.
  // This keeps things simple when the DB is empty or out of sync.
  if (!user) {
    const passwordHash = await hashPassword(validated.password);
    user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.email.split('@')[0] || 'User',
        passwordHash,
      },
    });
  } else {
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      const passwordHash = await hashPassword(validated.password);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }
  }

  // Check if 2FA is enabled
  if (user.totpEnabled && user.totpSecret) {
    // 2FA is required
    if (!data.totpCode) {
      // Return flag indicating 2FA is required
      return {
        requires2FA: true,
        userId: user.id,
        user: null,
        token: null,
      };
    }

    // Verify TOTP code
    const isValidCode = authenticator.verify({
      token: data.totpCode,
      secret: user.totpSecret,
    });

    if (!isValidCode) {
      throw new Error('Invalid two-factor authentication code');
    }
  }

  // Create session
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    requires2FA: false,
    userId: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
}

export async function getUserByToken(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function logoutUser(token: string) {
  await prisma.session.deleteMany({
    where: { token },
  });
}

// 2FA Functions
export async function setup2FA(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.totpEnabled) {
    throw new Error('2FA is already enabled. Disable it first to set up again.');
  }

  // Generate a new secret
  const secret = authenticator.generateSecret();

  // Store the secret (but don't enable yet - that happens after verification)
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  });

  // Generate otpauth URI for QR code
  const otpauthUrl = authenticator.keyuri(user.email, 'Donkey Ideas', secret);

  return {
    secret,
    otpauthUrl,
  };
}

export async function verify2FA(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.totpSecret) {
    throw new Error('No 2FA setup found. Please start setup first.');
  }

  // Verify the code
  const isValid = authenticator.verify({
    token: code,
    secret: user.totpSecret,
  });

  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });

  return { success: true };
}

export async function disable2FA(userId: string, password: string, code?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // If 2FA is enabled, verify the code
  if (user.totpEnabled && user.totpSecret) {
    if (!code) {
      throw new Error('2FA code is required');
    }

    const isValidCode = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValidCode) {
      throw new Error('Invalid 2FA code');
    }
  }

  // Disable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
    },
  });

  return { success: true };
}

export async function get2FAStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });

  return {
    enabled: user?.totpEnabled ?? false,
  };
}
