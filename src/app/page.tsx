'use client';

import PlanetariumScene from "@/app/planetarium/PlanetariumScene";

export default function Home() {
  return (
    <div className="h-screen flex flex-col items-center bg-neutral-900">
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="rounded-[2%] w-[100vw] h-full overflow-hidden relative">
          <PlanetariumScene />
        </div>
      </div>
    </div>
  );
}
