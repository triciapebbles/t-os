/**
 * Seeds initial categories, people and chores based on the "BAU - CHORES"
 * tab of the household's Dailies.xlsx sheet. Safe to re-run: uses
 * upserts / skips duplicates by name.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PEOPLE = ["Tricia", "Zane"];

const CATEGORIES: { name: string; color: string }[] = [
  { name: "kitchen", color: "#e07a5f" },
  { name: "plants", color: "#81b29a" },
  { name: "laundry", color: "#3d5a80" },
  { name: "toilet", color: "#8d99ae" },
  { name: "cats", color: "#f2a541" },
  { name: "bedroom", color: "#9d8189" },
];

type SeedChore = {
  name: string;
  category: string;
  owners: string[];
  description: string;
  frequency: string;
  durationMinutes: number;
  bestDoneOn: string;
};

// duration parsed to a representative number of minutes from the
// original "time needed" column (ranges use the midpoint).
const CHORES: SeedChore[] = [
  { name: "Get groceries", category: "kitchen", owners: ["Zane"], description: "Conduct weekly grocery shopping for next week's meals", frequency: "once a week", durationMinutes: 90, bestDoneOn: "sunday" },
  { name: "Meal prep", category: "kitchen", owners: ["Zane"], description: "Plan diet and required ingredients for next week's meals", frequency: "once a week", durationMinutes: 210, bestDoneOn: "sunday" },
  { name: "Water plants (table)", category: "plants", owners: ["Tricia"], description: "Table plants only", frequency: "once a week", durationMinutes: 15, bestDoneOn: "monday and saturday" },
  { name: "Water plants (floor)", category: "plants", owners: ["Tricia"], description: "Floor plants only", frequency: "once a week", durationMinutes: 15, bestDoneOn: "saturday" },
  { name: "Iron clothes", category: "laundry", owners: ["Zane"], description: "Iron work shirts and pants", frequency: "once a week", durationMinutes: 60, bestDoneOn: "sunday night" },
  { name: "Clean the toilet", category: "toilet", owners: ["Zane"], description: "Clean the toilet & clear poop stains", frequency: "once a week", durationMinutes: 30, bestDoneOn: "sunday night" },
  { name: "Keep the dishes", category: "kitchen", owners: ["Tricia", "Zane"], description: "Clear all dried dishes from the kitchen", frequency: "twice a week", durationMinutes: 15, bestDoneOn: "monday evening" },
  { name: "Monthly pet food restock", category: "cats", owners: ["Tricia"], description: "Check Petcubes, TGP, kibble, and adjust order accordingly", frequency: "once a month", durationMinutes: 15, bestDoneOn: "15th of every month" },
  { name: "Clip nails", category: "cats", owners: ["Tricia", "Zane"], description: "Clip cats' claws", frequency: "every 2 weeks", durationMinutes: 30, bestDoneOn: "every alternate sunday night" },
  { name: "Shave fur", category: "cats", owners: ["Tricia", "Zane"], description: "Shave cats' paw fur", frequency: "every 2 weeks", durationMinutes: 30, bestDoneOn: "every alternate sunday night" },
  { name: "Fold clothes", category: "laundry", owners: ["Tricia", "Zane"], description: "Fold washed and dried clothes", frequency: "twice a week", durationMinutes: 30, bestDoneOn: "wednesday and monday evenings" },
  { name: "Do the laundry", category: "laundry", owners: ["Tricia"], description: "Wash & hang clothes", frequency: "3 times a week", durationMinutes: 150, bestDoneOn: "every mon, thurs, and saturday" },
  { name: "Change the bedsheets", category: "bedroom", owners: ["Tricia", "Zane"], description: "Change bedsheets", frequency: "once every 2 months", durationMinutes: 30, bestDoneOn: "every alternate end of month" },
  { name: "Fridge clean out", category: "kitchen", owners: ["Tricia"], description: "Go through fridge and clear out all expired/uneaten food", frequency: "once a week", durationMinutes: 15, bestDoneOn: "sunday" },
  { name: "Brush cats' teeth", category: "cats", owners: ["Tricia"], description: "Brush cats' teeth", frequency: "twice a week", durationMinutes: 30, bestDoneOn: "every mon and friday" },
];

async function main() {
  console.log("Seeding people...");
  const peopleByName = new Map<string, string>();
  for (const name of PEOPLE) {
    const person = await prisma.person.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    peopleByName.set(name, person.id);
  }

  console.log("Seeding categories...");
  const categoriesByName = new Map<string, string>();
  for (const c of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name: c.name },
      update: { color: c.color },
      create: { name: c.name, color: c.color },
    });
    categoriesByName.set(c.name, category.id);
  }

  console.log("Seeding chores...");
  for (const chore of CHORES) {
    const existing = await prisma.chore.findFirst({ where: { name: chore.name } });
    if (existing) {
      console.log(`  skipping existing chore "${chore.name}"`);
      continue;
    }
    const categoryId = categoriesByName.get(chore.category);
    const created = await prisma.chore.create({
      data: {
        name: chore.name,
        description: chore.description,
        frequency: chore.frequency,
        bestDoneOn: chore.bestDoneOn,
        durationMinutes: chore.durationMinutes,
        categoryId,
        assignees: {
          create: chore.owners
            .map((owner) => peopleByName.get(owner))
            .filter((id): id is string => Boolean(id))
            .map((personId) => ({ personId })),
        },
      },
    });
    console.log(`  created "${created.name}"`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
