CREATE TABLE `MessageTemplates` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`hostGroup` text DEFAULT 'HOST_A' NOT NULL,
	`templateName` text NOT NULL,
	`messageType` text NOT NULL,
	`audience` text DEFAULT 'all' NOT NULL,
	`selectedGuestIds` text,
	`messageContent` text NOT NULL,
	`autoAttachInvitation` integer DEFAULT false,
	`isActive` integer DEFAULT true,
	`createdAt` text,
	`updatedAt` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
