import { redirect } from "next/navigation";

// The weekly schedule now lives on the home page (calendar + chores
// merged into one view). This route just forwards old links/bookmarks.
export default function ScheduleRedirect() {
  redirect("/");
}
