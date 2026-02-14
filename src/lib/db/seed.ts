import { db } from "../db/db";
import { events, eventTags, channels } from "../db/schema";
import { createUser, getUserByUsername } from "../beaver/user";
import { createProject } from "../beaver/project";
import { createChannel } from "../beaver/channel";
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
      ownerId: adminUser.id,
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

  // Create channels
  const channelsData = [
    { name: "sales", projectId: projects[0].id, description: "Track all sales and revenue events" },
    { name: "errors", projectId: projects[0].id, description: "Monitor application errors and failures" },
    { name: "signups", projectId: projects[0].id, description: "New user registrations and onboarding events" },
    { name: "notifications", projectId: projects[0].id, description: "Email and push notification delivery events" },
    { name: "purchases", projectId: projects[1].id, description: "In-app purchases and transactions" },
    { name: "crashes", projectId: projects[1].id, description: "Application crash reports and diagnostics" },
    { name: "analytics", projectId: projects[1].id, description: "User engagement and analytics events" },
  ];

  const channelMap: Record<string, { id: number; projectId: number }> = {};
  for (const c of channelsData) {
    try {
      const channel = await createChannel(c.name, c.projectId, c.description);
      console.log(`Created channel: ${channel.name}`);
      channelMap[`${c.projectId}-${c.name}`] = channel;
    } catch (e) {
      console.log(`Channel "${c.name}" already exists, skipping...`);
    }
  }

  // Event templates
  const ecomTemplates = [
    {
      name: "New Sale",
      descriptions: ["A customer completed a purchase", "Premium subscription purchased", "Flash sale item sold", "Bundle deal completed", "Gift card purchase", "Wholesale order placed", "Repeat customer order"],
      icon: "💰",
      channelName: "sales",
      projectId: projects[0].id,
      tagVariants: [
        { amount: 99.99, currency: "USD", customer_id: "cust_123", method: "credit_card" },
        { amount: 299.99, currency: "USD", plan: "premium", method: "paypal" },
        { amount: 49.95, currency: "EUR", customer_id: "cust_456", method: "credit_card" },
        { amount: 149.00, currency: "USD", plan: "business", method: "stripe" },
        { amount: 19.99, currency: "GBP", customer_id: "cust_789", method: "apple_pay" },
        { amount: 599.99, currency: "USD", customer_id: "cust_321", method: "credit_card" },
        { amount: 74.50, currency: "CAD", plan: "starter", method: "paypal" },
        { amount: 1249.00, currency: "USD", customer_id: "cust_vip", method: "wire_transfer" },
      ],
    },
    {
      name: "Refund Issued",
      descriptions: ["Customer requested a full refund", "Partial refund for damaged item", "Subscription cancellation refund", "Return processed and refunded", "Chargeback refund processed"],
      icon: "💸",
      channelName: "sales",
      projectId: projects[0].id,
      tagVariants: [
        { amount: 99.99, reason: "defective", customer_id: "cust_123" },
        { amount: 49.95, reason: "not_as_described", customer_id: "cust_456" },
        { amount: 299.99, reason: "cancellation", customer_id: "cust_001" },
        { amount: 19.99, reason: "duplicate_charge", customer_id: "cust_789" },
      ],
    },
    {
      name: "Cart Abandoned",
      descriptions: ["User left items in cart", "Cart expired after 24 hours", "User navigated away during checkout", "Payment page abandoned"],
      icon: "🛒",
      channelName: "sales",
      projectId: projects[0].id,
      tagVariants: [
        { cart_value: 89.99, items: 3, stage: "payment" },
        { cart_value: 249.00, items: 1, stage: "shipping" },
        { cart_value: 34.50, items: 2, stage: "review" },
        { cart_value: 599.99, items: 5, stage: "login" },
      ],
    },
    {
      name: "Payment Error",
      descriptions: ["Credit card declined", "Insufficient funds", "Payment gateway timeout", "Currency conversion failed", "3D Secure verification failed", "Card expired"],
      icon: "❌",
      channelName: "errors",
      projectId: projects[0].id,
      tagVariants: [
        { error_code: "card_declined", retryable: true, gateway: "stripe" },
        { error_code: "insufficient_funds", retryable: false, gateway: "stripe" },
        { error_code: "gateway_timeout", retryable: true, gateway: "paypal" },
        { error_code: "currency_error", retryable: true, gateway: "adyen" },
        { error_code: "3ds_failed", retryable: true, gateway: "stripe" },
        { error_code: "rate_limited", retryable: true, gateway: "braintree" },
        { error_code: "card_expired", retryable: false, gateway: "stripe" },
      ],
    },
    {
      name: "API Error",
      descriptions: ["Internal server error on /api/checkout", "Database connection timeout", "Rate limit exceeded", "Authentication token expired", "Invalid request payload", "Service unavailable"],
      icon: "🔥",
      channelName: "errors",
      projectId: projects[0].id,
      tagVariants: [
        { status_code: 500, endpoint: "/api/checkout", method: "POST" },
        { status_code: 504, endpoint: "/api/products", method: "GET" },
        { status_code: 429, endpoint: "/api/search", method: "GET" },
        { status_code: 401, endpoint: "/api/account", method: "PUT" },
        { status_code: 400, endpoint: "/api/orders", method: "POST" },
        { status_code: 503, endpoint: "/api/inventory", method: "GET" },
      ],
    },
    {
      name: "Validation Error",
      descriptions: ["Invalid email format", "Password too short", "Missing required field", "Invalid phone number"],
      icon: "⚠️",
      channelName: "errors",
      projectId: projects[0].id,
      tagVariants: [
        { field: "email", form: "signup", message: "invalid_format" },
        { field: "password", form: "signup", message: "too_short" },
        { field: "address", form: "checkout", message: "required" },
        { field: "phone", form: "profile", message: "invalid_format" },
      ],
    },
    {
      name: "User Signup",
      descriptions: ["New user registered via Google OAuth", "New user registered via email", "New user registered via GitHub", "New user registered via Apple ID", "New user via referral link", "New user from marketing campaign"],
      icon: "👤",
      channelName: "signups",
      projectId: projects[0].id,
      tagVariants: [
        { method: "google", referrer: "organic", country: "US" },
        { method: "email", newsletter_opt_in: true, country: "UK" },
        { method: "github", referrer: "blog_post", country: "DE" },
        { method: "apple", referrer: "app_store", country: "JP" },
        { method: "email", newsletter_opt_in: false, country: "FR" },
        { method: "google", referrer: "paid_ad", country: "US" },
        { method: "email", referrer: "referral", country: "CA" },
        { method: "google", referrer: "social_media", country: "BR" },
      ],
    },
    {
      name: "Account Deleted",
      descriptions: ["User requested account deletion", "Account removed due to inactivity", "GDPR deletion request processed"],
      icon: "🗑️",
      channelName: "signups",
      projectId: projects[0].id,
      tagVariants: [
        { reason: "user_request", account_age_days: 120 },
        { reason: "inactivity", account_age_days: 365 },
        { reason: "gdpr", account_age_days: 45 },
      ],
    },
    {
      name: "Email Sent",
      descriptions: ["Welcome email delivered", "Password reset email sent", "Order confirmation email sent", "Shipping notification sent", "Weekly digest delivered", "Promotional campaign sent"],
      icon: "📧",
      channelName: "notifications",
      projectId: projects[0].id,
      tagVariants: [
        { template: "welcome", provider: "sendgrid", status: "delivered" },
        { template: "password_reset", provider: "sendgrid", status: "delivered" },
        { template: "order_confirmation", provider: "ses", status: "delivered" },
        { template: "shipping_update", provider: "ses", status: "bounced" },
        { template: "weekly_digest", provider: "sendgrid", status: "delivered" },
        { template: "promo_campaign", provider: "mailchimp", status: "delivered" },
      ],
    },
    {
      name: "Push Notification",
      descriptions: ["Flash sale alert sent", "Order status update pushed", "Price drop notification", "Cart abandonment reminder", "New feature announcement"],
      icon: "🔔",
      channelName: "notifications",
      projectId: projects[0].id,
      tagVariants: [
        { type: "promo", platform: "ios", delivered: true },
        { type: "order_update", platform: "android", delivered: true },
        { type: "price_alert", platform: "ios", delivered: false },
        { type: "cart_reminder", platform: "android", delivered: true },
        { type: "announcement", platform: "ios", delivered: true },
      ],
    },
  ];

  const mobileTemplates = [
    {
      name: "In-App Purchase",
      descriptions: ["User bought premium features", "Coin pack purchased", "Ad-free upgrade bought", "Season pass activated", "Extra storage purchased", "Custom theme unlocked"],
      icon: "🛒",
      channelName: "purchases",
      projectId: projects[1].id,
      tagVariants: [
        { item: "pro_upgrade", price: 4.99, platform: "ios" },
        { item: "coin_pack_500", price: 2.99, platform: "android" },
        { item: "ad_free", price: 1.99, platform: "ios" },
        { item: "season_pass", price: 9.99, platform: "android" },
        { item: "storage_50gb", price: 0.99, platform: "ios" },
        { item: "pro_upgrade", price: 4.99, platform: "android" },
        { item: "coin_pack_1000", price: 4.99, platform: "ios" },
        { item: "custom_theme", price: 1.49, platform: "android" },
      ],
    },
    {
      name: "Subscription Renewed",
      descriptions: ["Monthly subscription auto-renewed", "Annual plan renewed", "Family plan renewed", "Student plan renewed", "Trial converted to paid"],
      icon: "🔄",
      channelName: "purchases",
      projectId: projects[1].id,
      tagVariants: [
        { plan: "monthly", price: 9.99, platform: "ios" },
        { plan: "annual", price: 79.99, platform: "android" },
        { plan: "family", price: 14.99, platform: "ios" },
        { plan: "student", price: 4.99, platform: "android" },
        { plan: "trial_convert", price: 9.99, platform: "ios" },
      ],
    },
    {
      name: "Subscription Cancelled",
      descriptions: ["User cancelled monthly plan", "Annual plan not renewed", "Downgraded to free tier"],
      icon: "📉",
      channelName: "purchases",
      projectId: projects[1].id,
      tagVariants: [
        { plan: "monthly", reason: "too_expensive", platform: "ios" },
        { plan: "annual", reason: "not_using", platform: "android" },
        { plan: "family", reason: "switching_service", platform: "ios" },
      ],
    },
    {
      name: "App Crash",
      descriptions: ["Crash in checkout flow", "Crash on app launch", "Crash during media upload", "Crash in settings screen", "Crash during sync", "Out of memory crash", "Null pointer exception"],
      icon: "💥",
      channelName: "crashes",
      projectId: projects[1].id,
      tagVariants: [
        { screen: "checkout", os_version: "iOS 17.2", app_version: "2.1.0" },
        { screen: "launch", os_version: "Android 14", app_version: "2.1.0" },
        { screen: "media_upload", os_version: "iOS 17.1", app_version: "2.0.9" },
        { screen: "settings", os_version: "Android 13", app_version: "2.1.0" },
        { screen: "sync", os_version: "iOS 16.5", app_version: "2.0.8" },
        { screen: "feed", os_version: "Android 14", app_version: "2.1.1" },
        { screen: "camera", os_version: "iOS 17.0", app_version: "2.1.0" },
      ],
    },
    {
      name: "ANR Detected",
      descriptions: ["Application not responding on main thread", "ANR during database query", "ANR on network request", "UI thread blocked by heavy computation"],
      icon: "🐌",
      channelName: "crashes",
      projectId: projects[1].id,
      tagVariants: [
        { screen: "home", os_version: "Android 14", duration_ms: 8500 },
        { screen: "search", os_version: "Android 13", duration_ms: 12000 },
        { screen: "profile", os_version: "Android 12", duration_ms: 6200 },
        { screen: "gallery", os_version: "Android 14", duration_ms: 9100 },
      ],
    },
    {
      name: "Screen View",
      descriptions: ["User viewed home screen", "User viewed profile page", "User viewed search results", "User viewed product detail", "User viewed settings", "User viewed notifications"],
      icon: "👁",
      channelName: "analytics",
      projectId: projects[1].id,
      tagVariants: [
        { screen: "home", session_id: "sess_001", platform: "ios" },
        { screen: "profile", session_id: "sess_002", platform: "android" },
        { screen: "search", session_id: "sess_003", platform: "ios" },
        { screen: "product_detail", session_id: "sess_004", platform: "android" },
        { screen: "settings", session_id: "sess_005", platform: "ios" },
        { screen: "notifications", session_id: "sess_006", platform: "android" },
      ],
    },
    {
      name: "Feature Used",
      descriptions: ["User used dark mode toggle", "User exported data", "User shared content", "User used barcode scanner", "User enabled notifications", "User customized dashboard"],
      icon: "⚡",
      channelName: "analytics",
      projectId: projects[1].id,
      tagVariants: [
        { feature: "dark_mode", platform: "ios", user_tier: "free" },
        { feature: "data_export", platform: "android", user_tier: "pro" },
        { feature: "share", platform: "ios", user_tier: "free" },
        { feature: "barcode_scan", platform: "android", user_tier: "pro" },
        { feature: "notifications", platform: "ios", user_tier: "free" },
        { feature: "dashboard_custom", platform: "android", user_tier: "pro" },
      ],
    },
    {
      name: "Session Started",
      descriptions: ["New app session began", "User returned after background", "Cold start session", "Session from push notification", "Session from deep link"],
      icon: "🚀",
      channelName: "analytics",
      projectId: projects[1].id,
      tagVariants: [
        { type: "cold_start", platform: "ios", app_version: "2.1.0" },
        { type: "warm_start", platform: "android", app_version: "2.1.0" },
        { type: "from_push", platform: "ios", app_version: "2.0.9" },
        { type: "from_deeplink", platform: "android", app_version: "2.1.1" },
        { type: "cold_start", platform: "android", app_version: "2.1.0" },
      ],
    },
    {
      name: "User Feedback",
      descriptions: ["User submitted app rating", "Bug report submitted", "Feature request sent", "Support ticket opened"],
      icon: "💬",
      channelName: "analytics",
      projectId: projects[1].id,
      tagVariants: [
        { type: "rating", rating: 5, platform: "ios" },
        { type: "bug_report", severity: "high", platform: "android" },
        { type: "feature_request", category: "ui", platform: "ios" },
        { type: "support_ticket", priority: "medium", platform: "android" },
      ],
    },
  ];

  const allTemplates = [...ecomTemplates, ...mobileTemplates];

  // Generate 500 events with timestamps spread over the last 30 days
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const totalEvents = 500;
  let eventCount = 0;

  console.log(`Creating ${totalEvents} events...`);

  for (let i = 0; i < totalEvents; i++) {
    const template = allTemplates[i % allTemplates.length];
    const descIndex = i % template.descriptions.length;
    const tagIndex = i % template.tagVariants.length;

    // Spread timestamps across last 30 days (newest first)
    const ageMs = Math.floor((i / totalEvents) * thirtyDaysMs + Math.random() * 3600000);
    const createdAt = new Date(now - ageMs);

    const channelKey = `${template.projectId}-${template.channelName}`;
    const chan = channelMap[channelKey];
    if (!chan) continue;

    try {
      // Insert event directly to control the timestamp
      const res = await db
        .insert(events)
        .values({
          name: template.name,
          description: template.descriptions[descIndex],
          icon: template.icon,
          projectId: template.projectId,
          channelId: chan.id,
          createdAt,
        })
        .returning();

      const event = res[0];

      // Insert tags
      const tags = template.tagVariants[tagIndex];
      const tagEntries = Object.entries(tags).map(([key, value]) => ({
        eventId: event.id,
        key,
        value: String(value),
        type: typeof value as "string" | "number" | "boolean",
      }));

      await db.insert(eventTags).values(tagEntries);

      eventCount++;
      if (eventCount % 50 === 0) {
        console.log(`  Created ${eventCount} events...`);
      }
    } catch (err) {
      console.log(`Failed to create event "${template.name}": ${err}`);
    }
  }

  console.log(`\nCreated ${eventCount} events total.`);
  console.log("Database seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
