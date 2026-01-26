"use client";

import { useEffect, useRef } from "react";

export default function TestPage() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Test native DOM listener
    const handleClick = (e: MouseEvent) => {
      console.log("NATIVE CLICK FIRED!", e.target);
      alert("Native click works!");
    };

    if (buttonRef.current) {
      buttonRef.current.addEventListener("click", handleClick);
    }

    // Also test document-level
    document.addEventListener("click", (e) => {
      console.log("DOCUMENT CLICK:", e.target);
    }, true);

    return () => {
      if (buttonRef.current) {
        buttonRef.current.removeEventListener("click", handleClick);
      }
    };
  }, []);

  return (
    <div style={{ padding: "50px" }}>
      <h1>Test Page</h1>
      <button
        ref={buttonRef}
        onClick={() => {
          console.log("REACT CLICK FIRED!");
          alert("React click works!");
        }}
        style={{ padding: "20px", fontSize: "20px", margin: "10px" }}
      >
        Test Button (React onClick)
      </button>
      <button
        onClick={() => {
          console.log("REACT CLICK 2 FIRED!");
          alert("React click 2 works!");
        }}
        style={{ padding: "20px", fontSize: "20px", margin: "10px" }}
      >
        Test Button 2
      </button>
      <div
        onClick={() => {
          console.log("DIV CLICK FIRED!");
          alert("Div click works!");
        }}
        style={{
          padding: "20px",
          backgroundColor: "blue",
          color: "white",
          cursor: "pointer",
          display: "inline-block",
          margin: "10px"
        }}
      >
        Test Div (Click Me)
      </div>
      <p>Open console and click the buttons above. Check if any events fire.</p>
    </div>
  );
}



