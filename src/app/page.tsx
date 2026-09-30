import { HomeContent } from "@/components/home/HomeContent";

/** The home page. Its text lives in a client component so it follows the chosen language; it is still prerendered. */
export default function Home() {
  return <HomeContent />;
}
