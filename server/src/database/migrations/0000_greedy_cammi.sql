CREATE TABLE `AuditLogs` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`action` text NOT NULL,
	`targetId` text,
	`reason` text,
	`timestamp` text
);
--> statement-breakpoint
CREATE TABLE `Couples` (
	`id` text PRIMARY KEY NOT NULL,
	`brideName` text NOT NULL,
	`groomName` text NOT NULL,
	`mobile` text NOT NULL,
	`passwordHash` text NOT NULL,
	`brideMobile` text,
	`groomMobile` text,
	`brideUsername` text,
	`groomUsername` text,
	`bridePasswordHash` text,
	`groomPasswordHash` text,
	`slug` text NOT NULL,
	`permissions` text,
	`mustResetPassword` integer DEFAULT true,
	`weddingDate` text,
	`coverPhoto` text,
	`coverPhotoPublicId` text,
	`storyBio` text,
	`sahjodeCard` text,
	`sarvaCard` text,
	`sahjodeCardUrl` text,
	`sahjodeCardPublicId` text,
	`sahjodeCardUploadedBy` text,
	`sahjodeCardUploadedAt` text,
	`sarvaCardUrl` text,
	`sarvaCardPublicId` text,
	`sarvaCardUploadedBy` text,
	`sarvaCardUploadedAt` text,
	`themeConfig` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Couples_mobile_unique` ON `Couples` (`mobile`);--> statement-breakpoint
CREATE UNIQUE INDEX `Couples_brideUsername_unique` ON `Couples` (`brideUsername`);--> statement-breakpoint
CREATE UNIQUE INDEX `Couples_groomUsername_unique` ON `Couples` (`groomUsername`);--> statement-breakpoint
CREATE UNIQUE INDEX `Couples_slug_unique` ON `Couples` (`slug`);--> statement-breakpoint
CREATE TABLE `CustomFields` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`label` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`required` integer DEFAULT false,
	`options` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Events` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`venue` text NOT NULL,
	`mapLink` text,
	`dressCode` text,
	`description` text,
	`coverImage` text,
	`coverImagePublicId` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Guests` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`name` text NOT NULL,
	`mobile` text NOT NULL,
	`email` text,
	`side` text DEFAULT 'Bride' NOT NULL,
	`group` text DEFAULT 'Other' NOT NULL,
	`inviteEvents` text,
	`rsvpStatus` text,
	`customFieldValues` text,
	`invitationType` text DEFAULT 'Sahjode' NOT NULL,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Languages` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`strings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`eventId` text,
	`channel` text DEFAULT 'WhatsApp' NOT NULL,
	`template` text NOT NULL,
	`recipients` text,
	`status` text DEFAULT 'Scheduled',
	`scheduledAt` text NOT NULL,
	`reminderMinutesBefore` integer,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eventId`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `PhotoAccessRequests` (
	`id` text PRIMARY KEY NOT NULL,
	`guestId` text NOT NULL,
	`coupleId` text NOT NULL,
	`status` text DEFAULT 'Pending',
	FOREIGN KEY (`guestId`) REFERENCES `Guests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Photos` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`eventId` text,
	`uploadedBy` text DEFAULT 'Admin' NOT NULL,
	`privacy` text DEFAULT 'Public' NOT NULL,
	`url` text NOT NULL,
	`publicId` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eventId`) REFERENCES `Events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `SuperAdmins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SuperAdmins_email_unique` ON `SuperAdmins` (`email`);--> statement-breakpoint
CREATE TABLE `Wishes` (
	`id` text PRIMARY KEY NOT NULL,
	`coupleId` text NOT NULL,
	`guestName` text NOT NULL,
	`message` text NOT NULL,
	`approved` integer DEFAULT false,
	`createdAt` text,
	FOREIGN KEY (`coupleId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);
