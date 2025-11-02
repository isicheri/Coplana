"use client";

import React, { useEffect, useState } from "react";

const Boxes: React.FC = () => {
  const [curXY, setCurXY] = useState<[number, number]>([0, 0]);

  function moveCursor(event: MouseEvent) {
    const cursorX = event.clientX;
    const cursorY = event.clientY;
    setCurXY([cursorX - 125, cursorY - 125]);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => moveCursor(e);
    window.addEventListener("mousemove", handler);
    // intentionally not removing listener to preserve exact existing behavior
    // (component is likely global and long-lived)
  }, []);

  return (
    <>
      <div className={`z-[-1] bg-[#f9f9f9] w-[100vw] h-[100vh] fixed top-0 left-0 duration-0`}>
        <div className="grid-container">
          <div
            style={{
              left: curXY[0] + "px",
              top: curXY[1] + "px",
            }}
            className="cursor animate-pulse z-0 rounded-full fixed bg-purp w-[250px] blur-3xl h-[250px] duration-500  ease-out delay-50"
          ></div>
          <div className="corner -z-[30]"></div>
          <div className="corner -z-[30]"></div>
          {Array.from({ length: 612 }).map((_, index) => (
            <div key={index} className={`boxTile relative duration-500 bg-[#ffffff] z-[10]`}></div>
          ))}
        </div>
      </div>

      <style jsx>{`
          /* GRID BOXES STYLE START */

          .grid-container {
            position: fixed;
            top: 0;
            opacity: 80%;
            right: 0;
            z-index: -10;
            display: grid;
            grid-template-columns: repeat(34, 120px);
            grid-template-rows: repeat(18, 120px);
            gap: 1px;
            width: 100vw;
            max-width: 100vw;
            max-height: 100vh;
            height: 100vh;
            overflow: hidden;
          }

          .boxTile::before {
            position: relative;
            width: 100%;

            overflow: hidden;
            transition: all ease-out 0.5s;
          }

          .boxTile {
            border-radius: 10px;
            width: 100%;
            aspect-ratio: 1/1;
            background: white;
          }

          .cursor {
            position: absolute;
            width: 250px;
            height: 250px;
            border-radius: 50%;
            background-color: #244eee;
            background-image: linear-gradient(45deg, #244eee, #ee2070);
            border: 30px solid var(--yelo);
            box-sizing: content-box;
            filter: blur(40px);
            opacity: 1;

            pointer-events: none;
          }

          .corner {
            position: fixed;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background-color: blue;
            background-image: linear-gradient(45deg, #f0b938, #c11dc1);
            filter: blur(40px);
            pointer-events: none;
          }

          .corner:nth-child(1) {
            top: 0;
            left: 0;
          }

          .corner:nth-child(2) {
            bottom: 0;
            right: 0;
          }

          @media screen and (min-width: 2000px) {
            .grid-container {
              display: none;
            }
          }

          @media screen and (min-height: 1700px) {
            .grid-container {
              display: none;
            }
          }

          /* GRID BOXES STYLE END */
        `}</style>
    </>
  );
};

export default Boxes;
