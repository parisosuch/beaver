ALTER TABLE `channels` ADD COLUMN `order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS new_order
  FROM channels
)
UPDATE channels
SET `order` = (SELECT new_order FROM ranked WHERE ranked.id = channels.id);
