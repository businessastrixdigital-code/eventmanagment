ALTER TABLE `MessageReminders` ADD `status` text DEFAULT 'Active';
ALTER TABLE `MessageReminders` ADD `lastTriggeredAt` text;
