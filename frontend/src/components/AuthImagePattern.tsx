import { useState, useEffect } from "react";
import React from "react";

interface AuthImagePatternProps {
  title: string;
  subtitle: string;
}

const AuthImagePattern: React.FC<AuthImagePatternProps> = ({ title, subtitle }) => {
  const images = ["/ocp.jpeg"];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="hidden lg:flex items-center justify-center h-full w-full relative">

      <img
        src={images[currentIndex]}
        alt="background"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
      />


      <div className="relative max-w-md text-center flex flex-col justify-end h-full pb-8 bg-opacity-50 w-full">
        <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
        <p className="text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
