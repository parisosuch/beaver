import { createUser, getUserByUsername } from "../beaver/user";
import { createProject } from "../beaver/project";
import { createChannel } from "../beaver/channel";
import { createEvent } from "../beaver/event";
import { initDB } from "./init";

async function seed() {
  await initDB();
  console.log("Seeding database...\n");

  // Create admin user
  let adminUser;
  const existingAdmin = await getUserByUsername("admin");
  if (existingAdmin) {
    console.log("Admin user already exists, skipping...");
    adminUser = existingAdmin;
  } else {
    adminUser = await createUser("admin", "admin123", true);
    console.log(`Created admin user: ${adminUser.userName}`);
  }

  // Create regular user
  let regularUser;
  const existingUser = await getUserByUsername("demo");
  if (existingUser) {
    console.log("Demo user already exists, skipping...");
    regularUser = existingUser;
  } else {
    regularUser = await createUser("demo", "demo123", false);
    console.log(`Created demo user: ${regularUser.userName}`);
  }

  // Create sample projects
  const projectsData = [
    {
      name: "E-commerce App",
      apiKey: "ecom_api_key_12345",
      ownerId: adminUser.id,
    },
    {
      name: "Mobile App",
      apiKey: "mobile_api_key_67890",
      ownerId: regularUser.id,
    },
  ];

  const projects = [];
  for (const p of projectsData) {
    try {
      const project = await createProject(p.name, p.apiKey, p.ownerId);
      console.log(`Created project: ${project.name}`);
      projects.push(project);
    } catch (e) {
      console.log(`Project "${p.name}" already exists, skipping...`);
    }
  }

  if (projects.length === 0) {
    console.log("\nNo new projects created. Database may already be seeded.");
    return;
  }

  // Create channels for each project
  const channelsData = [
    {
      name: "sales",
      projectId: projects[0].id,
      description: "Track all sales and revenue events",
    },
    {
      name: "errors",
      projectId: projects[0].id,
      description: "Monitor application errors and failures",
    },
    {
      name: "signups",
      projectId: projects[0].id,
      description: "New user registrations and onboarding events",
    },
    {
      name: "purchases",
      projectId: projects[1].id,
      description: "In-app purchases and transactions",
    },
    {
      name: "crashes",
      projectId: projects[1].id,
      description: "Application crash reports and diagnostics",
    },
  ];

  const createdChannels: Record<string, { id: number; projectId: number }> = {};
  for (const c of channelsData) {
    try {
      const channel = await createChannel(c.name, c.projectId, c.description);
      console.log(`Created channel: ${channel.name}`);
      createdChannels[`${c.projectId}-${c.name}`] = channel;
    } catch (e) {
      console.log(`Channel "${c.name}" already exists, skipping...`);
    }
  }

  // Create sample events
  const eventsData: {
    name: string;
    description: string;
    icon: string;
    channel: string;
    apiKey: string;
    tags: Record<string, string | number | boolean>;
  }[] = [
    {
      name: "New Sale",
      description: "A customer completed a purchase",
      icon: "💰",
      channel: "sales",
      apiKey: "ecom_api_key_12345",
      tags: { amount: 99.99, currency: "USD", customer_id: "cust_123" },
    },
    {
      name: "New Sale",
      description: "Premium subscription purchased",
      icon: "💰",
      channel: "sales",
      apiKey: "ecom_api_key_12345",
      tags: { amount: 299.99, currency: "USD", plan: "premium" },
    },
    {
      name: "Payment Error",
      description: "Credit card declined",
      icon: "❌",
      channel: "errors",
      apiKey: "ecom_api_key_12345",
      tags: { error_code: "card_declined", retryable: true },
    },
    {
      name: "User Signup",
      description: "New user registered via Google OAuth",
      icon: "👤",
      channel: "signups",
      apiKey: "ecom_api_key_12345",
      tags: { method: "google", referrer: "organic" },
    },
    {
      name: "User Signup",
      description: "New user registered via email",
      icon: "👤",
      channel: "signups",
      apiKey: "ecom_api_key_12345",
      tags: { method: "email", newsletter_opt_in: true },
    },
    {
      name: "In-App Purchase",
      description: "User bought premium features",
      icon: "🛒",
      channel: "purchases",
      apiKey: "mobile_api_key_67890",
      tags: { item: "pro_upgrade", price: 4.99, platform: "ios" },
    },
    {
      name: "App Crash",
      description: "Crash in checkout flow",
      icon: "💥",
      channel: "crashes",
      apiKey: "mobile_api_key_67890",
      tags: {
        screen: "checkout",
        os_version: "iOS 17.2",
        app_version: "2.1.0",
      },
    },
  ];

  for (const e of eventsData) {
    try {
      const event = await createEvent(e);
      console.log(`Created event: ${event.name} (${event.channelName})`);
    } catch (err) {
      console.log(`Failed to create event "${e.name}": ${err}`);
    }
  }

  console.log("\nDatabase seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
