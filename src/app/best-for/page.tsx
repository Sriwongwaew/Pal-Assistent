import { redirect } from "next/navigation";

/* "Bäst för…" gick upp i rollbanden på /recommendations (aug 2026).
   Rutten står kvar som omdirigering: bokmärken och gamla länkar ska landa
   rätt, inte på en 404. */
export default function BestForPage() {
  redirect("/recommendations");
}
