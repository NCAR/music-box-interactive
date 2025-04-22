import React from "react";
import Layout from "../components/Layout";
import EmptySpace from "../components/EmptySpace";
import About from "../components/Home/About";
import BehindTheMusic from "../components/Home/BehindTheMusic";
import Collaborators from "../components/Home/Collaborators";
import Sponsors from "../components/Home/Sponsors";
import Developers from "../components/Home/Developers";
import Contact from "../components/Home/Contact";
import gapImg from "../assets/image_ammann.jpg";

export default function Home() {
  const gapStyle = {
    backgroundImage: `url(${gapImg})`,
    height: "300px",
  };

  return (
    <Layout>
      <main role="main">
        <About />
        <EmptySpace height={150} />
        <BehindTheMusic />
        <div className="about-section hero-img" style={gapStyle}></div>
        <Collaborators />
        <Sponsors />
        <Developers />
        <Contact />
        <div className="pt-4 px-2">
          <p>
            <small>
              Background images: Copyright University Corporation for
              Atmospheric Research (UCAR). By Carlye Calvin and Caspar Ammann,
              licensed under a Creative Commons Attribution-NonCommercial 4.0
              International (CC BY-NC 4.0) License, via OpenSky.
            </small>
          </p>
        </div>
      </main>
    </Layout>
  );
}
