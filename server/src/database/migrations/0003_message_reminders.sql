CREATE TABLE `MessageReminders` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`hostGroup` text DEFAULT 'HOST_A' NOT NULL,
	`templateId` text NOT NULL,
	`eventId` text NOT NULL,
	`timing` text NOT NULL,
	`customMinutesBefore` integer,
	`isEnabled` integer DEFAULT true,
	`createdAt` text,
	`updatedAt` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`templateId`) REFERENCES `MessageTemplates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eventId`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE cascade
);
