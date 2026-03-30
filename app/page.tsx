import HeroContent from "./components/ui/landing/HeroContent";
import BackgroundShader from "./components/ui/landing/BackgroundShader";
import AppWrapper from "./components/ui/landing/AppWrapper";

export default function Home() {
  return (
    <AppWrapper>
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
        <BackgroundShader />
        
        <div className="absolute inset-0 z-20 hero-wrapper">
         <HeroContent />
        </div>
      </div>
    </AppWrapper>
  );
}