import { prisma } from '@donkey-ideas/database';

export async function logActivity(
  userId: string,
  companyId: string | null | undefined,
  action: string,
  entityType: string,
  entityId?: string | null,
  changes?: any
) {
  try {
    if (!prisma.activity) {
      // Activity model might not exist yet
      return;
    }
    
    await prisma.activity.create({
      data: {
        userId,
        companyId: companyId || undefined,
        action,
        entityType,
        entityId: entityId || undefined,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      },
    });
  } catch (error) {
    // Don't fail the main operation if activity logging fails
    console.error('Failed to log activity:', error);
  }
}

