import { Loader } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef } from "react";

const LoaderOverlay = () => {
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTimeout(() => {
      overlay.current?.remove();
    }, 3000);
  }, []);
  return (
    <>
      <div
        ref={overlay}
        className="loaderOverlay fixed flex flex-col gap-8 py-16 items-center justify-start p-8 top-0 left-0 w-full h-screen  z-[90] bg-wht "
      >
        <Image
          src="/logo-gradient.svg"
          alt="coplana"
          width={140}
          height={40}
          className="w-[30%] animate-pulse my-auto max-w-[550px] relative z-[2]"
        />

        <div className=" flex text-xl text-gry items-center gap-1">
          <div className="spinner w-[30px] h-[30px]">
            <Loader size={30} />
          </div>
          <span className=""> Setting up your space</span>
        </div>
      </div>
    </>
  );
};

export default LoaderOverlay;
