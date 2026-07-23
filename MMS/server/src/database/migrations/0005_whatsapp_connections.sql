CREATE TABLE `whatsapp_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`functionId` text NOT NULL,
	`hostGroup` text DEFAULT 'HOST_A' NOT NULL,
	`phone` text,
	`sessionId` text NOT NULL,
	`status` text DEFAULT 'Disconnected' NOT NULL,
	`connectedAt` text,
	`lastSeen` text,
	`createdAt` text,
	`updatedAt` text,
	FOREIGN KEY (`functionId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `communication_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`notificationId` text,
	`functionId` text NOT NULL,
	`guestId` text,
	`guestName` text,
	`hostGroup` text DEFAULT 'HOST_A' NOT NULL,
	`sessionId` text,
	`phone` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`sentAt` text,
	`error` text,
	`retryCount` integer DEFAULT 0,
	`createdAt` text,
	`updatedAt` text,
	FOREIGN KEY (`notificationId`) REFERENCES `Notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`functionId`) REFERENCES `Couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guestId`) REFERENCES `Guests`(`id`) ON UPDATE no action ON DELETE set null
);
