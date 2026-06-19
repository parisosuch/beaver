import { db } from "../db/db";
import { emailSettings } from "../db/schema";
import { eq } from "drizzle-orm";

export type EmailProvider = "resend" | "smtp";

export type EmailSettings = {
  id: number;
  provider: EmailProvider;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
  smtpFromEmail: string | null;
};

export type EmailSettingsUpdate = {
  provider: EmailProvider;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword?: string | null;
  smtpSecure: boolean;
  smtpFromEmail: string | null;
};

export async function getEmailSettings(): Promise<EmailSettings | null> {
  const rows = await db.select().from(emailSettings).limit(1);
  return rows[0] ?? null;
}

export async function updateEmailSettings(update: EmailSettingsUpdate): Promise<EmailSettings> {
  const existing = await getEmailSettings();

  const values = {
    provider: update.provider,
    smtpHost: update.smtpHost,
    smtpPort: update.smtpPort,
    smtpUsername: update.smtpUsername,
    smtpSecure: update.smtpSecure,
    smtpFromEmail: update.smtpFromEmail,
    updatedAt: new Date(),
    ...(update.smtpPassword !== undefined ? { smtpPassword: update.smtpPassword } : {}),
  };

  if (!existing) {
    const [row] = await db
      .insert(emailSettings)
      .values({ ...values, smtpPassword: update.smtpPassword ?? null })
      .returning();
    return row as EmailSettings;
  }

  const [row] = await db
    .update(emailSettings)
    .set(values)
    .where(eq(emailSettings.id, existing.id))
    .returning();
  return row as EmailSettings;
}
