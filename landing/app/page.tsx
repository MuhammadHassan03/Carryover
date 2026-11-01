import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Ch1OldWay from "@/components/chapters/Ch1OldWay";
import Ch2Scan from "@/components/chapters/Ch2Scan";
import Ch3Recipe from "@/components/chapters/Ch3Recipe";
import Ch4TwoRoads from "@/components/chapters/Ch4TwoRoads";
import Ch5Tidy from "@/components/chapters/Ch5Tidy";
import Ch6Safety from "@/components/chapters/Ch6Safety";
import Ch7Unpacked from "@/components/chapters/Ch7Unpacked";
import FreeGive from "@/components/chapters/FreeGive";
import Faq from "@/components/chapters/Faq";
import StoryClient from "@/components/StoryClient";
import ShotBand from "@/components/chapters/ShotBand";
import { SHOTS } from "@/components/chapters/shots";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Ch1OldWay />
        <Ch2Scan />
        <Ch3Recipe />
        <ShotBand label="The PC Recipe screen" shots={[SHOTS.recipe]} />
        <Ch4TwoRoads />
        <ShotBand label="Choosing a mode, and a plan fitted to a new laptop" shots={[SHOTS.mode, SHOTS.newDevice]} />
        <Ch5Tidy />
        <ShotBand label="Organize my files, switched on" shots={[SHOTS.organize]} />
        <Ch6Safety />
        <ShotBand label="A plan that passes, and a risky one that gets blocked" shots={[SHOTS.plan, SHOTS.risky]} />
        <Ch7Unpacked />
        <FreeGive />
        <Faq />
      </main>
      <SiteFooter />
      <StoryClient />
    </>
  );
}
