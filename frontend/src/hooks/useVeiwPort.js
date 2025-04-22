import { useState, useEffect } from "react";

export const useVeiwPort = ({ breakPoint }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isDesktop = window.innerWidth > breakPoint;
  const [isOpen, setIsOpen] = useState(isDesktop);
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);

      if (newWidth > breakPoint) {
        setIsOpen(true);
      } else if (newWidth <= breakPoint) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("load", handleResize);

    // Clean-up
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("load", handleResize);
    };
  }, [windowWidth, breakPoint]);
  return { isOpen, setIsOpen };
};
