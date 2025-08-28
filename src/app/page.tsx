import { LandingPage } from "./page.client";
import { connection } from "next/server";
import { getNotionDatabaseRowCount } from "~/lib/utils";

export const dyamic = "force-dynamic";

export default async function Home() {
  

  return <LandingPage  />;
}
